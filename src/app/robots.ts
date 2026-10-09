/**
 * robots.txt for whichever storefront this hostname is.
 *
 * It lives at the app root, not under `app/[store]/`, because Next only
 * registers `robots.ts` there — in a dynamic segment it is silently not a
 * route at all, which is why no storefront has ever served a robots.txt. The
 * store comes from the slug the middleware resolves for this request.
 */
import type { MetadataRoute } from 'next';
import { storeSlug } from '@/lib/store-slug';
import { loadStore } from '@/lib/sdk/store';
import { shopOrigin } from '@/lib/seo/canonical';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const store = storeSlug();
  // No store resolved means no shop to crawl — keep it out of the index.
  if (!store) return { rules: { userAgent: '*', disallow: '/' } };

  const resolved = await loadStore(store).catch(() => null);
  const isPublished = resolved?.storefrontConfig?.isPublished ?? false;

  // The same resolver the canonical tags and the sitemap use. Built by hand
  // here before, and it would have pasted `https://` onto a custom domain the
  // merchant had already typed one into — putting
  // `Sitemap: https://https://shop.example/sitemap.xml` in the one file a
  // crawler reads first.
  const base = shopOrigin(store, resolved?.storefrontConfig).replace(/\/+$/, '');

  if (!isPublished) {
    return {
      rules: { userAgent: '*', disallow: '/' },
    };
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Don't index account, cart, checkout — private/transactional pages
        disallow: ['/account', '/cart', '/checkout', '/login', '/register'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
