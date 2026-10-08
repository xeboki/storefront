import {
  loadStore, loadStoreDraft, loadCatalog, loadCategories, loadProduct,
} from '@/lib/sdk/store';
import type { SectionContext } from '@/components/home/types';

/**
 * Everything any band might need, gathered once.
 *
 * Extracted from the home page so the band preview draws from exactly the
 * same values. A preview assembled from its own copy of this would be a
 * second truth about what a band shows — and the whole point of previewing
 * the real renderer rather than a drawing of it is that it cannot lie about
 * what the shop will do.
 */
export async function loadSectionContext(
  slug: string,
  /**
   * Show the page the merchant is still working on. The token is minted by
   * the API for one shop; without one this is the published page, which is
   * what every caller but the preview wants.
   */
  previewToken?: string,
): Promise<{ ctx: SectionContext; homeSections: unknown[] } | null> {
  const resolved = previewToken
    ? await loadStoreDraft(slug, previewToken)
    : await loadStore(slug);
  if (!resolved) return null;

  const { apiKey, storefrontConfig, storeConfig } = resolved;

  const [catalogResult, categoriesResult] = await Promise.allSettled([
    loadCatalog(apiKey),
    loadCategories(apiKey),
  ]);

  const products = catalogResult.status === 'fulfilled' ? catalogResult.value.data : [];
  const categories = categoriesResult.status === 'fulfilled' ? categoriesResult.value.data : [];
  const active = products.filter((p) => p.isActive);

  // The merchant's own pick, in the order they arranged it. Fetched by id
  // rather than looked up in `active`: that list is one page of the
  // catalogue, so a curated product further down it would silently fail to
  // match and the whole selection would fall back — indistinguishable from
  // having chosen nothing. `loadProduct` is cached per id.
  const chosenIds = (storefrontConfig?.featuredProductIds ?? []).slice(0, 8);
  const curated = chosenIds.length
    ? (await Promise.all(chosenIds.map((id) => loadProduct(apiKey, id).catch(() => null))))
        // An id that no longer resolves — deleted, deactivated, not in this
        // branch's catalogue — is skipped rather than left as a hole.
        .filter((p): p is NonNullable<typeof p> => Boolean(p) && p!.isActive)
    : [];

  // A selection that is empty, or entirely stale, falls back so a band that
  // asked for products never renders blank.
  const featured = curated.length > 0 ? curated : active.slice(0, 8);

  const chosenCategoryIds = storefrontConfig?.featuredCategoryIds ?? [];
  const shownCategories = chosenCategoryIds.length > 0
    ? chosenCategoryIds
        .map((id) => categories.find((c) => c.id === id))
        .filter((c): c is NonNullable<typeof c> => Boolean(c))
    : categories;

  const ctx: SectionContext = {
    storeSlug: slug,
    storeConfig,
    storefrontConfig,
    products: active,
    categories,
    featured,
    shownCategories,
  };

  return { ctx, homeSections: storefrontConfig?.homeSections ?? [] };
}
