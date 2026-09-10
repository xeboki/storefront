/**
 * Store resolution helpers.
 *
 * Resolves a merchant slug to their API key + store config, with ISR caching.
 * Called once per page render — expensive work is behind Next.js `unstable_cache`.
 */
import { unstable_cache } from 'next/cache';
import { resilientRead } from './resilient';
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

    // Serve the last-known-good store on a transient upstream error rather than
    // 404-ing the whole shop. Cold miss while down → null (genuine not-found).
    return resilientRead<ResolvedStore>(`store:${slug}`, async () => {
      const { getXebokiClient } = await import('./client');
      const client = getXebokiClient(apiKey);
      const storeConfig = await client.ordering.getStoreConfig();
      const storefrontConfig = await client.ordering.getStorefrontConfig().catch(() => null);
      return {
        slug,
        apiKey,
        isTestMode: apiKey.startsWith('xbk_test_'),
        storeConfig,
        storefrontConfig,
      };
    }, { fallback: 'null' });
  },
  ['store-config'],
  { revalidate: 300, tags: ['store-config'] }, // 5 min cache
);

// ---------------------------------------------------------------------------
// Catalog helpers (60s ISR — product listings change more frequently)
// ---------------------------------------------------------------------------

export interface CatalogQuery {
  categoryId?: string;
  search?: string;
  inStockOnly?: boolean;
  sort?: 'name_asc' | 'name_desc' | 'price_asc' | 'price_desc' | 'newest';
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  perPage?: number;
}

/**
 * A single page of the catalog, searched and filtered SERVER-SIDE. Replaces the
 * old "load 100 and filter in the browser" approach, which silently capped the
 * catalog at 100 products and never searched beyond them.
 */
export const loadCatalog = unstable_cache(
  async (apiKey: string, query: CatalogQuery = {}) => {
    const { getXebokiClient } = await import('./client');
    const client = getXebokiClient(apiKey);
    const perPage = query.perPage ?? 24;
    const page = Math.max(1, query.page ?? 1);
    const cacheKey = `catalog:${apiKey.slice(-8)}:${query.categoryId ?? ''}:${query.search ?? ''}:${query.inStockOnly ? 1 : 0}:${query.sort ?? ''}:${query.minPrice ?? ''}:${query.maxPrice ?? ''}:${page}:${perPage}`;
    const res = await resilientRead(cacheKey, () => client.ordering.listProducts({
      categoryId: query.categoryId,
      search: query.search,
      inStockOnly: query.inStockOnly,
      sort: query.sort,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
      limit: perPage,
      offset: (page - 1) * perPage,
    }));
    return res ?? { data: [], total: 0, limit: perPage, offset: (page - 1) * perPage };
  },
  ['catalog'],
  { revalidate: 60, tags: ['catalog'] },
);

export const loadCategories = unstable_cache(
  async (apiKey: string) => {
    const { getXebokiClient } = await import('./client');
    const client = getXebokiClient(apiKey);
    const res = await resilientRead(`categories:${apiKey.slice(-8)}`, () => client.ordering.listCategories());
    return res ?? { data: [], total: 0, limit: 50, offset: 0 };
  },
  ['categories'],
  { revalidate: 300, tags: ['categories'] },
);

export const loadUpsells = unstable_cache(
  async (apiKey: string, productId: string) => {
    const { getXebokiClient } = await import('./client');
    const client = getXebokiClient(apiKey);
    try {
      return await client.ordering.listUpsells([productId]);
    } catch {
      return [];
    }
  },
  ['upsells'],
  { revalidate: 300, tags: ['catalog'] },
);

export const loadProduct = unstable_cache(
  async (apiKey: string, slug: string) => {
    const { getXebokiClient } = await import('./client');
    const client = getXebokiClient(apiKey);
    return resilientRead(`product:${apiKey.slice(-8)}:${slug}`, () => client.ordering.getProductBySlug(slug), { fallback: 'null' });
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
