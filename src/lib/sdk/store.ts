/**
 * Store resolution helpers.
 *
 * Resolves a merchant slug to their API key + store config, with ISR caching.
 * Called once per page render — expensive work is behind Next.js `unstable_cache`.
 */
import { unstable_cache } from 'next/cache';
import type { StoreConfig, StorefrontConfig } from '@xeboki/sdk';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ResolvedStore {
  slug: string;
  apiKey: string;
  isTestMode: boolean;
  storeConfig: StoreConfig;
  storefrontConfig: StorefrontConfig | null;
}

// ---------------------------------------------------------------------------
// Internal: fetch from Xeboki API using the slug-derived lookup key
// ---------------------------------------------------------------------------

/**
 * Xeboki's API doesn't have an unauthenticated "resolve slug → api key" endpoint
 * because API keys are sensitive. Instead, we use a platform-level key that is
 * allowed to look up store configs by slug. This key lives in the environment and
 * is scoped to read-only store resolution only.
 *
 * If you don't have a platform key yet, the simplest workaround for Phase 1 is
 * to embed API keys per slug in environment variables:
 *   STORE_KEY_my-coffee-shop=xbk_live_...
 *
 * This function falls back to that pattern.
 */
async function resolveApiKey(slug: string): Promise<string | null> {
  const envKey = process.env[`STORE_KEY_${slug.replace(/-/g, '_').toUpperCase()}`];
  if (envKey) return envKey;
  return null;
}

// ---------------------------------------------------------------------------
// Cached store loader
// ---------------------------------------------------------------------------

export const loadStore = unstable_cache(
  async (slug: string): Promise<ResolvedStore | null> => {
    const apiKey = await resolveApiKey(slug);
    if (!apiKey) return null;

    // Lazy import to keep the module tree clean
    const { getXebokiClient } = await import('./client');
    const client = getXebokiClient(apiKey);

    const [storeConfig, storefrontConfig] = await Promise.allSettled([
      client.ordering.getStoreConfig(),
      // storefrontConfig is optional — returns 404 if not yet configured
      client.ordering.getStorefrontConfig().catch(() => null),
    ]);

    if (storeConfig.status === 'rejected') return null;

    return {
      slug,
      apiKey,
      isTestMode: apiKey.startsWith('xbk_test_'),
      storeConfig: storeConfig.value,
      storefrontConfig:
        storefrontConfig.status === 'fulfilled' ? storefrontConfig.value : null,
    };
  },
  ['store-config'],
  { revalidate: 300, tags: ['store-config'] }, // 5 min cache
);

// ---------------------------------------------------------------------------
// Catalog helpers (60s ISR — product listings change more frequently)
// ---------------------------------------------------------------------------

export const loadCatalog = unstable_cache(
  async (apiKey: string, categoryId?: string) => {
    const { getXebokiClient } = await import('./client');
    const client = getXebokiClient(apiKey);
    // returns OrderingListResponse with .data array
    return client.ordering.listProducts({ categoryId, limit: 100 });
  },
  ['catalog'],
  { revalidate: 60, tags: ['catalog'] },
);

export const loadCategories = unstable_cache(
  async (apiKey: string) => {
    const { getXebokiClient } = await import('./client');
    const client = getXebokiClient(apiKey);
    return client.ordering.listCategories();
  },
  ['categories'],
  { revalidate: 300, tags: ['categories'] },
);

export const loadProduct = unstable_cache(
  async (apiKey: string, slug: string) => {
    const { getXebokiClient } = await import('./client');
    const client = getXebokiClient(apiKey);
    return client.ordering.getProductBySlug(slug);
  },
  ['product-by-slug'],
  { revalidate: 60, tags: ['catalog'] },
);

// ---------------------------------------------------------------------------
// Blog helpers (10 min cache — blog changes are infrequent)
// ---------------------------------------------------------------------------

export const loadBlogPosts = unstable_cache(
  async (apiKey: string, status?: 'draft' | 'published') => {
    const { getXebokiClient } = await import('./client');
    const client = getXebokiClient(apiKey);
    return client.ordering.listBlogPosts({ status, limit: 100 });
  },
  ['blog-posts'],
  { revalidate: 600, tags: ['blog'] },
);

export const loadBlogPost = unstable_cache(
  async (apiKey: string, slug: string) => {
    const { getXebokiClient } = await import('./client');
    const client = getXebokiClient(apiKey);
    return client.ordering.getBlogPost(slug);
  },
  ['blog-post'],
  { revalidate: 300, tags: ['blog'] },
);

// ---------------------------------------------------------------------------
// Custom pages helpers (10 min cache)
// ---------------------------------------------------------------------------

export const loadCustomPages = unstable_cache(
  async (apiKey: string, isPublished?: boolean) => {
    const { getXebokiClient } = await import('./client');
    const client = getXebokiClient(apiKey);
    return client.ordering.listCustomPages({ isPublished });
  },
  ['custom-pages'],
  { revalidate: 600, tags: ['pages'] },
);

export const loadCustomPage = unstable_cache(
  async (apiKey: string, slug: string) => {
    const { getXebokiClient } = await import('./client');
    const client = getXebokiClient(apiKey);
    return client.ordering.getCustomPage(slug);
  },
  ['custom-page'],
  { revalidate: 300, tags: ['pages'] },
);

// ---------------------------------------------------------------------------
// Ordering location resolution (5 min cache)
//
// Online orders must name a location, but only when the business has more than
// one — a single-location shop is resolved server-side. The storefront has no
// UI concept of a location, so it defers to the API's own "ordering-enabled"
// list (the single source of truth) and takes the first. Returns null when the
// merchant has not enabled online ordering on any location, so callers can say
// so plainly instead of surfacing a raw 400.
// ---------------------------------------------------------------------------

export const resolveOrderingLocationId = unstable_cache(
  async (apiKey: string): Promise<string | null> => {
    const { getXebokiClient } = await import('./client');
    const client = getXebokiClient(apiKey);
    try {
      const res = await client.ordering.listLocations();
      return res.data[0]?.id ?? null;
    } catch {
      return null;
    }
  },
  ['ordering-location'],
  { revalidate: 300, tags: ['store-config'] },
);
