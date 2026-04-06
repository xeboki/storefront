import type { MetadataRoute } from 'next';
import { loadStore, loadCatalog, loadCategories, loadBlogPosts, loadCustomPages } from '@/lib/sdk/store';

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? 'xeboki.store';

export default async function sitemap({
  params,
}: {
  params: { store: string };
}): Promise<MetadataRoute.Sitemap> {
  const { store } = params;

  const resolved = await loadStore(store).catch(() => null);
  if (!resolved) return [];

  // Unpublished stores should not be indexed at all
  if (!resolved.storefrontConfig?.isPublished) return [];

  const base = resolved.storefrontConfig?.customDomain
    ? `https://${resolved.storefrontConfig.customDomain}`
    : `https://${store}.${BASE_DOMAIN}`;

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
      lastModified: undefined,
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
    ...categoryRoutes,
    ...productRoutes,
    ...blogRoutes,
    ...customPageRoutes,
  ];
}
