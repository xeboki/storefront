import { notFound } from 'next/navigation';
import { loadStore, loadCatalog, loadCategories, loadProduct } from '@/lib/sdk/store';
import { HomeSections } from '@/components/home/HomeSections';
import { showSection } from '@/lib/sections';
import type { SectionContext } from '@/components/home/types';

interface Props {
  params: { store: string };
}

/**
 * The shop's front page.
 *
 * It used to be nine bands in a fixed order written into this file, so every
 * Xeboki shop on the internet had the same page in the same sequence whether
 * it sold engine parts, haircuts or espresso. Now it is a list the merchant
 * arranged, and this file's whole job is to gather what every band might need
 * and hand it over.
 *
 * The API resolves the fallback, so `homeSections` is never empty: a shop
 * that has arranged nothing is served the page its trade has always had. One
 * default, defined once, in `services/storefront_sections.py`.
 */
export default async function StorePage({ params }: Props) {
  const resolved = await loadStore(params.store);
  if (!resolved) notFound();

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
    storeSlug: params.store,
    storeConfig,
    storefrontConfig,
    products: active,
    categories,
    featured,
    shownCategories,
    apiKey,
  };

  // `sections` — the old on/off map — still has the last word.
  //
  // A merchant who switched a band off before the editor existed did so
  // deliberately, and arriving at a rearrangeable page must not quietly turn
  // it back on. The instance's own `visible` is checked by the renderer;
  // this is the older switch, honoured by the name the band carries.
  const arranged = (storefrontConfig?.homeSections ?? [])
    .filter((s) => showSection(storefrontConfig, s.type as never));

  return <HomeSections sections={arranged} ctx={ctx} />;
}
