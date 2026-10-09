import type { MetadataRoute } from 'next';
import { storeSlug } from '@/lib/store-slug';
import { loadStore, loadCatalog, loadCategories, loadBlogPosts, loadCustomPages } from '@/lib/sdk/store';
import { locationSlugs } from '@/lib/location';
import { shopOrigin } from '@/lib/seo/canonical';

export default async function sitemap({
  params,
}: {
  params?: { store?: string };
}): Promise<MetadataRoute.Sitemap> {
  const store = storeSlug(params);
  if (!store) return [];

  const resolved = await loadStore(store).catch(() => null);
  if (!resolved) return [];

  // Unpublished stores should not be indexed at all
  if (!resolved.storefrontConfig?.isPublished) return [];

  // The same resolver the canonical tags use. Built by hand here before, and
  // differently: it prefixed `https://` onto a custom domain the merchant had
  // typed WITH a scheme (`https://https://shop.example`) and kept a trailing
  // slash. So a sitemap could advertise addresses that no page claimed as its
  // canonical — a crawler reading both is told the shop disagrees with itself.
  const base = shopOrigin(store, resolved.storefrontConfig).replace(/\/+$/, '');

  const [catalogResult, categoriesResult, blogResult, pagesResult] = await Promise.allSettled([
    loadCatalog(resolved.apiKey),
    loadCategories(resolved.apiKey),
    loadBlogPosts(resolved.apiKey, 'published'),
    loadCustomPages(resolved.apiKey, true),
  ]);

  const products    = catalogResult.status === 'fulfilled' ? catalogResult.value.data : [];
  const categories  = categoriesResult.status === 'fulfilled' ? categoriesResult.value.data : [];
  const blogPosts   = blogResult.status === 'fulfilled' ? blogResult.value.data : [];
  const customPages = pagesResult.status === 'fulfilled' ? pagesResult.value.data : [];

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`,        changeFrequency: 'daily',   priority: 1.0 },
    { url: `${base}/catalog`, changeFrequency: 'daily',   priority: 0.9 },
    ...(blogPosts.length > 0
      ? [{ url: `${base}/blog`, changeFrequency: 'weekly' as const, priority: 0.8 }]
      : []),
  ];

  // One entry per branch. These are the pages a local search is meant to find,
  // so they are worth more than a category listing.
  const branches = [...locationSlugs(resolved.storefrontConfig).keys()];
  const locationRoutes: MetadataRoute.Sitemap = branches.length > 0
    ? [
        { url: `${base}/locations`, changeFrequency: 'monthly' as const, priority: 0.8 },
        ...branches.map((slug) => ({
          url: `${base}/l/${slug}`,
          changeFrequency: 'monthly' as const,
          priority: 0.8,
        })),
      ]
    : [];

  const categoryRoutes: MetadataRoute.Sitemap = categories
    .filter((c) => c.id !== '_uncategorized')
    .map((c) => ({
      url: `${base}/catalog?category=${c.id}`,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));

  const productRoutes: MetadataRoute.Sitemap = products
    .filter((p) => p.isActive)
    .map((p) => ({
      url: `${base}/product/${p.id}`,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
      // The catalog response has always carried `updated_at`; the SDK dropped
      // it and this line then said so explicitly. A sitemap with no dates
      // gives a crawler no reason to come back to a page that changed.
      lastModified: p.updatedAt ? new Date(p.updatedAt) : undefined,
    }));

  const blogRoutes: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${base}/blog/${post.slug}`,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
    lastModified: post.updatedAt ? new Date(post.updatedAt) : undefined,
  }));

  const customPageRoutes: MetadataRoute.Sitemap = customPages.map((page) => ({
    url: `${base}/p/${page.slug}`,
    changeFrequency: 'monthly' as const,
    priority: 0.5,
    lastModified: page.updatedAt ? new Date(page.updatedAt) : undefined,
  }));

  return [
    ...staticRoutes,
    ...locationRoutes,
    ...categoryRoutes,
    ...productRoutes,
    ...blogRoutes,
    ...customPageRoutes,
  ];
}
