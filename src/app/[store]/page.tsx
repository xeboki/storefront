import { notFound } from 'next/navigation';
import Link from 'next/link';
import { loadStore, loadCatalog, loadCategories, loadProduct } from '@/lib/sdk/store';
import { HeroSection } from '@/components/layout/HeroSection';
import { FeaturedProducts } from '@/components/product/FeaturedProducts';
import { CategoryGrid } from '@/components/product/CategoryGrid';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { TrustBar } from '@/components/layout/TrustBar';
import { EditorialBand } from '@/components/layout/EditorialBand';
import { CollectionBand } from '@/components/layout/CollectionBand';
import { onlineStores } from '@/lib/location';

interface Props {
  params: { store: string };
}

const APPOINTMENT_TYPES = new Set([
  'salon', 'gym', 'service', 'petStore', 'optical', 'mobileRepair',
]);
const WORK_ORDER_TYPES = new Set(['mobileRepair', 'laundry', 'service', 'optical']);
const AGE_GATE_TYPES = new Set(['liquorStore']);

export default async function StorePage({ params }: Props) {
  const resolved = await loadStore(params.store);
  if (!resolved) notFound();

  const { apiKey, storefrontConfig, storeConfig } = resolved;
  const bt = storeConfig.businessType;

  const [catalogResult, categoriesResult] = await Promise.allSettled([
    loadCatalog(apiKey),
    loadCategories(apiKey),
  ]);

  const products = catalogResult.status === 'fulfilled' ? catalogResult.value.data : [];
  const categories = categoriesResult.status === 'fulfilled' ? categoriesResult.value.data : [];
  const active = products.filter((p) => p.isActive);

  // The merchant's own pick, in the order they arranged it. These ids have
  // been in the config, the API response and the SDK type all along and
  // nothing read them, so curating a home page did nothing at all — the shop
  // always showed whichever eight products happened to come back first.
  // Fetched by id rather than looked up in `active`: that list is one page of
  // the catalogue, so a curated product further down it silently failed to
  // match and the whole selection fell back — which is indistinguishable from
  // the bug this replaces. loadProduct is cached per id.
  const chosenIds = (storefrontConfig?.featuredProductIds ?? []).slice(0, 8);
  const curated = chosenIds.length
    ? (await Promise.all(chosenIds.map((id) => loadProduct(apiKey, id).catch(() => null))))
        // An id that no longer resolves — deleted, deactivated, not in this
        // branch's catalogue — is skipped rather than left as a hole.
        .filter((p): p is NonNullable<typeof p> => Boolean(p) && p!.isActive)
    : [];

  // A selection that is empty, or entirely stale, falls back so the section
  // never renders blank.
  const featured = curated.length > 0 ? curated : active.slice(0, 8);

  // The band takes whichever category has the most to show — a composition
  // built around a department holding two things would be a thin one.
  // Same for categories: the merchant's chosen set, else everything.
  const chosenCategoryIds = storefrontConfig?.featuredCategoryIds ?? [];
  const shownCategories = chosenCategoryIds.length > 0
    ? chosenCategoryIds
        .map((id) => categories.find((c) => c.id === id))
        .filter((c): c is NonNullable<typeof c> => Boolean(c))
    : categories;

  const spotlight = shownCategories
    .filter((c) => c.id !== '_uncategorized')
    .map((c) => ({ category: c, items: active.filter((p) => p.categoryId === c.id) }))
    .sort((a, b) => b.items.length - a.items.length)[0];

  return (
    <div>
      {/* Age gate warning banner */}
      {AGE_GATE_TYPES.has(bt) && (
        <div className="bg-amber-50 border-b border-amber-200 py-2 px-4 text-center text-sm text-amber-800">
          You must be 21+ to purchase alcohol. By shopping here you confirm you are of legal drinking age.
        </div>
      )}

      <HeroSection storefrontConfig={storefrontConfig} storeConfig={storeConfig} storeSlug={params.store} />

      {/* Business-type CTAs */}
      {APPOINTMENT_TYPES.has(bt) && (
        <section className="bg-primary/5 border-b border-primary/10 py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-fg">Book an Appointment</h2>
              <p className="text-sm text-fg-muted mt-0.5">Choose your service, staff, and time — online in seconds.</p>
            </div>
            <Link
              href={`/${params.store}/book`}
              className="flex-shrink-0 px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-brand hover:opacity-90 transition-opacity text-sm"
            >
              Book Now
            </Link>
          </div>
        </section>
      )}

      {WORK_ORDER_TYPES.has(bt) && !APPOINTMENT_TYPES.has(bt) && (
        <section className="bg-surface-alt border-b border-line py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-fg">Track Your Order</h2>
              <p className="text-sm text-fg-muted mt-0.5">Enter your ticket number to see the status of your repair or job.</p>
            </div>
            <Link
              href={`/${params.store}/repairs`}
              className="flex-shrink-0 px-6 py-2.5 border border-primary text-primary font-semibold rounded-brand hover:bg-primary/5 transition-colors text-sm"
            >
              Track Order
            </Link>
          </div>
        </section>
      )}

      {/* Reassurance, immediately under the hero, where a first-time buyer
          looks before trusting a name they do not know. */}
      <TrustBar storefrontConfig={storefrontConfig} currency={storeConfig.currencyCode} />

      {shownCategories.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-14 sm:py-20 lg:py-32 sm:px-6 lg:px-8">
          <SectionHeader
            eyebrow="Browse"
            title={APPOINTMENT_TYPES.has(bt) ? 'Our Services' : 'Shop by category'}
            lede={
              APPOINTMENT_TYPES.has(bt)
                ? 'Book any of the services this store offers.'
                : 'Every department in the store, in one place.'
            }
            href={`/${params.store}/catalog`}
            linkLabel="All products"
          />
          <CategoryGrid categories={shownCategories} storeSlug={params.store} />
        </section>
      )}

      {featured.length > 0 && (
        <section className="border-t border-line">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:py-20 lg:py-32 sm:px-6 lg:px-8">
            <SectionHeader
              eyebrow="Handpicked"
              title={APPOINTMENT_TYPES.has(bt) ? 'Featured services' : 'Featured products'}
              lede="Chosen by the store this week."
              href={`/${params.store}/catalog`}
            />
            <FeaturedProducts products={featured} storeSlug={params.store} />
          </div>
        </section>
      )}

      {spotlight && spotlight.items.length >= 2 && (
        <CollectionBand
          category={spotlight.category}
          products={spotlight.items}
          storeSlug={params.store}
        />
      )}

      {/* A different rhythm between the grids, so the page is not three lists
          stacked on top of each other. */}
      <EditorialBand
        storeConfig={storeConfig}
        storeSlug={params.store}
        imageUrl={storefrontConfig?.heroImageUrl}
        stores={onlineStores(storefrontConfig)}
      />
    </div>
  );
}
