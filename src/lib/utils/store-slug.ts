import { headers } from 'next/headers'

/**
 * Extracts the store slug from Next.js server context.
 * In production the middleware rewrites /{slug}/... into the URL.
 * We read it from the x-store-slug header set by middleware.
 */
export async function getStoreSlug(): Promise<string> {
  const hdrs = await headers()
  return hdrs.get('x-store-slug') ?? 'demo'
}
