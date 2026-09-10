import { headers } from 'next/headers'

/**
 * Extracts the store slug from Next.js server context.
 * In production the middleware rewrites /{slug}/... into the URL and forwards
 * the slug on the request headers.
 *
 * Returns null when there is no slug rather than naming a store: it used to
 * fall back to 'demo', so a page that failed to receive a slug quietly served
 * (or failed to find) the wrong shop instead of saying it had no shop.
 */
export async function getStoreSlug(): Promise<string | null> {
  const hdrs = await headers()
  return hdrs.get('x-store-slug')
}
