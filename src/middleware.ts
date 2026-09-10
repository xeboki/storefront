/**
 * Storefront middleware.
 *
 * Responsibilities:
 *   1. Subdomain routing: {slug}.xeboki.store → /[store]/... rewrite
 *   2. Rate limiting on API routes (Gap 80) — sliding-window, in-memory
 *      (for production replace with Upstash Redis / Vercel KV)
 *   3. x-store-slug header injection (consumed by server components)
 */
import { NextRequest, NextResponse } from 'next/server'

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? 'xeboki.store'
const DEV_STORE_SLUG = process.env.NEXT_PUBLIC_DEV_STORE_SLUG

// ── In-memory rate limiter (Gap 80) ───────────────────────────────────────────
// Edge runtime doesn't allow node modules — use a simple Map-based counter.
// For multi-instance deploys wire up Upstash Redis instead.

interface RateBucket {
  count: number
  resetAt: number
}

const _rateBuckets = new Map<string, RateBucket>()

const RATE_LIMITS: Record<string, { limit: number; windowMs: number }> = {
  '/api/checkout':       { limit: 10,  windowMs: 60_000 },   // 10 checkouts/min
  '/api/auth':           { limit: 20,  windowMs: 60_000 },   // 20 auth calls/min
  '/api/reviews':        { limit: 30,  windowMs: 60_000 },
  '/api/wishlist':       { limit: 60,  windowMs: 60_000 },
  '/api/repairs/lookup': { limit: 30,  windowMs: 60_000 },
  '/api':                { limit: 120, windowMs: 60_000 },   // global API fallback
}

function getRateKey(ip: string, routePrefix: string): string {
  return `${ip}:${routePrefix}`
}

function checkRateLimit(
  ip: string,
  pathname: string
): { allowed: boolean; limit: number; remaining: number; resetAt: number } {
  // Find most specific matching rule
  const matchedRoute = Object.keys(RATE_LIMITS)
    .filter(prefix => pathname.startsWith(prefix))
    .sort((a, b) => b.length - a.length)[0]

  if (!matchedRoute) return { allowed: true, limit: 999, remaining: 999, resetAt: 0 }

  const rule = RATE_LIMITS[matchedRoute]
  const key  = getRateKey(ip, matchedRoute)
  const now  = Date.now()

  let bucket = _rateBuckets.get(key)
  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 0, resetAt: now + rule.windowMs }
    _rateBuckets.set(key, bucket)
  }

  bucket.count++
  const remaining = Math.max(rule.limit - bucket.count, 0)
  return {
    allowed:   bucket.count <= rule.limit,
    limit:     rule.limit,
    remaining,
    resetAt:   bucket.resetAt,
  }
}

// ── Middleware ─────────────────────────────────────────────────────────────────

export function middleware(request: NextRequest) {
  const { pathname, searchParams, hostname } = request.nextUrl

  // Skip Next.js internals and static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // ── Rate limiting for API routes ───────────────────────────────────────────
  if (pathname.startsWith('/api')) {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
      request.headers.get('x-real-ip') ??
      '127.0.0.1'

    const rl = checkRateLimit(ip, pathname)

    if (!rl.allowed) {
      return new NextResponse(
        JSON.stringify({ error: 'Too many requests', retryAfter: Math.ceil((rl.resetAt - Date.now()) / 1000) }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit':     String(rl.limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset':     String(Math.ceil(rl.resetAt / 1000)),
            'Retry-After':           String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
          },
        }
      )
    }

    // Pass through with rate limit headers
    const res = NextResponse.next()
    res.headers.set('X-RateLimit-Limit',     String(rl.limit))
    res.headers.set('X-RateLimit-Remaining', String(rl.remaining))
    res.headers.set('X-RateLimit-Reset',     String(Math.ceil(rl.resetAt / 1000)))
    return res
  }

  // ── Subdomain routing ──────────────────────────────────────────────────────
  let slug: string | null = null

  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    const parts = hostname.split('.')
    if (parts.length >= 3 && hostname.endsWith(BASE_DOMAIN)) {
      slug = parts[0]
    }
  } else {
    slug = searchParams.get('store') ?? DEV_STORE_SLUG ?? null
  }

  if (!slug) return NextResponse.next()
  if (pathname.startsWith(`/${slug}`)) return NextResponse.next()

  const rewriteUrl = request.nextUrl.clone()
  rewriteUrl.pathname = `/${slug}${pathname}`

  // The slug has to travel on the REQUEST headers to be readable by
  // `headers()` in a server component. Setting it on the response only sent it
  // back to the browser, so every reader fell through to its 'demo' default.
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-store-slug', slug)

  return NextResponse.rewrite(rewriteUrl, { request: { headers: requestHeaders } })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
