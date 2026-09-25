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

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? 'xeboki.store';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const store = storeSlug();
  // No store resolved means no shop to crawl — keep it out of the index.
  if (!store) return { rules: { userAgent: '*', disallow: '/' } };

  const resolved = await loadStore(store).catch(() => null);
  const isPublished = resolved?.storefrontConfig?.isPublished ?? false;

  const base = resolved?.storefrontConfig?.customDomain
    ? `https://${resolved.storefrontConfig.customDomain}`
    : `https://${store}.${BASE_DOMAIN}`;

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
