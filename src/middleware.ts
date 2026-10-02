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
import { LOCATION_COOKIE, LOCATION_COOKIE_MAX_AGE } from '@/lib/location-cookie'
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE } from '@/lib/i18n/locale-cookie'

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
  '/api/mobile/v1/session': { limit: 20,  windowMs: 60_000 }, // sign-in exchanges
  '/api/mobile/v1/orders':  { limit: 15,  windowMs: 60_000 }, // order placement
  '/api/mobile':            { limit: 300, windowMs: 60_000 }, // mobile reads (per IP)
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

// ── Distributed limiter (Upstash REST) ────────────────────────────────────────
// The in-memory Map below only ever sees one serverless instance, so across a
// real deployment it enforces nothing. When Upstash env is present we count in
// Redis instead — a single pipelined REST call, Edge-compatible. A transport
// error fails OPEN (better to serve than to wrongly 429 everyone on a blip).

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

async function checkRateLimitUpstash(
  ip: string,
  pathname: string,
): Promise<{ allowed: boolean; limit: number; remaining: number; resetAt: number } | null> {
  const matchedRoute = Object.keys(RATE_LIMITS)
    .filter(prefix => pathname.startsWith(prefix))
    .sort((a, b) => b.length - a.length)[0]
  if (!matchedRoute) return { allowed: true, limit: 999, remaining: 999, resetAt: 0 }

  const rule = RATE_LIMITS[matchedRoute]
  const winSec = Math.ceil(rule.windowMs / 1000)
  const key = `rl:${getRateKey(ip, matchedRoute)}`

  try {
    // SET key 0 EX <win> NX  (start the window only if absent) then INCR.
    const res = await fetch(`${UPSTASH_URL}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([
        ['SET', key, '0', 'EX', String(winSec), 'NX'],
        ['INCR', key],
      ]),
      cache: 'no-store',
    })
    if (!res.ok) return null
    const out = (await res.json()) as Array<{ result: unknown }>
    const count = Number(out?.[1]?.result ?? 0)
    return {
      allowed: count <= rule.limit,
      limit: rule.limit,
      remaining: Math.max(rule.limit - count, 0),
      resetAt: Date.now() + rule.windowMs,
    }
  } catch {
    return null // transport error → fall through to in-memory / fail open
  }
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

export async function middleware(request: NextRequest) {
  const { pathname, searchParams, hostname } = request.nextUrl

  // Skip Next.js internals and static files.
  //
  // `/sitemap.xml` and `/robots.txt` are the exception: they contain a dot, so
  // the catch-all below sent them straight through without the store rewrite,
  // and since the routes live at app/[store]/ nothing served them — both
  // 404'd on every storefront. They are exactly the two files a crawler asks
  // for by name, so they must be rewritten like any other page.
  const CRAWLER_FILES = new Set(['/sitemap.xml', '/robots.txt'])
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    (pathname.includes('.') && !CRAWLER_FILES.has(pathname))
  ) {
    return NextResponse.next()
  }

  // ── Rate limiting for API routes ───────────────────────────────────────────
  if (pathname.startsWith('/api')) {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
      request.headers.get('x-real-ip') ??
      '127.0.0.1'

    const rl =
      (UPSTASH_URL && UPSTASH_TOKEN
        ? await checkRateLimitUpstash(ip, pathname)
        : null) ?? checkRateLimit(ip, pathname)

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

  // ── Theme preview ──────────────────────────────────────────────────────────
  // `?theme=<preset>` lets Manager deep-link a live preview of a preset before
  // the merchant saves it. A layout cannot read searchParams, so it travels as
  // a request header. Visual only, never persisted — safe to leave public.
  const themePreview = searchParams.get('theme')

  // ── Chosen store ───────────────────────────────────────────────────────────
  // `?loc=` used to be read by the catalog page alone, so the store a shopper
  // picked was forgotten the moment they opened a product. Remember it here and
  // every server render — catalog, product, cart, checkout — reads the same one.
  // The value is validated against the store's own branches before it is
  // trusted; see lib/location.ts.
  const chosenLocation = searchParams.get('loc')

  // ── Chosen language ────────────────────────────────────────────────────────
  // `?lang=`, remembered the same way. The dictionaries have always existed;
  // nothing let a shopper pick one.
  const chosenLocale = searchParams.get('lang')

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

  // The slug has to travel on the REQUEST headers to be readable by
  // `headers()` in a server component. Setting it on the response only sent it
  // back to the browser, so every reader fell through to its 'demo' default.
  const requestHeaders = new Headers(request.headers)
  // The path the shopper asked for, for a server component that has to
  // know it. Next does not reliably expose one: the store layout was
  // reading `x-invoke-path`/`x-pathname`, got an empty string, and so
  // could not tell the sign-in page from any other — a shop with
  // "require login to browse" on redirected /login to /login, which is
  // a shop nobody can get into.
  requestHeaders.set('x-xeboki-path', pathname)
  if (themePreview) requestHeaders.set('x-xeboki-theme', themePreview)
  // Also on the REQUEST, because a cookie set on the response is not visible to
  // `cookies()` in the render it was set during — the first page after a switch
  // would still show the old store.
  if (chosenLocation) requestHeaders.set('x-xeboki-loc', chosenLocation)
  if (chosenLocale) requestHeaders.set('x-xeboki-lang', chosenLocale)
  if (slug) requestHeaders.set('x-store-slug', slug)

  const remember = (res: NextResponse) => {
    if (chosenLocation) {
      res.cookies.set(LOCATION_COOKIE, chosenLocation, {
        path: '/',
        maxAge: LOCATION_COOKIE_MAX_AGE,
        sameSite: 'lax',
      })
    }
    if (chosenLocale) {
      res.cookies.set(LOCALE_COOKIE, chosenLocale, {
        path: '/',
        maxAge: LOCALE_COOKIE_MAX_AGE,
        sameSite: 'lax',
      })
    }
    return res
  }

  const passthrough = () => remember(NextResponse.next({ request: { headers: requestHeaders } }))

  if (!slug) return passthrough()
  if (pathname.startsWith(`/${slug}`)) return passthrough()
  // robots.ts is only ever a route at the app root, so it must NOT be rewritten
  // under the slug — it reads the store from the header set just above.
  if (pathname === '/robots.txt') return passthrough()

  const rewriteUrl = request.nextUrl.clone()
  rewriteUrl.pathname = `/${slug}${pathname}`

  return remember(NextResponse.rewrite(rewriteUrl, { request: { headers: requestHeaders } }))
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
