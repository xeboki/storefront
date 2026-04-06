import type { MetadataRoute } from 'next';
import { loadStore } from '@/lib/sdk/store';

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? 'xeboki.store';

export default async function robots({
  params,
}: {
  params: { store: string };
}): Promise<MetadataRoute.Robots> {
  const { store } = params;

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
