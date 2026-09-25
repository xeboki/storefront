import { headers } from 'next/headers';

/**
 * Which store this request is for.
 *
 * `sitemap.ts` and `robots.ts` live under `app/[store]/`, but Next does not
 * populate `params` for a metadata route inside a dynamic segment unless it is
 * enumerated with `generateSitemaps`. Both read `params.store` and so threw on
 * every request — which, together with the middleware skipping any path
 * containing a dot, is why no storefront has ever served either file.
 *
 * The middleware already puts the resolved slug on the request, so take it
 * from there and keep `params` only as a fallback.
 */
export function storeSlug(params?: { store?: string }): string | null {
  return headers().get('x-store-slug') ?? params?.store ?? null;
}
