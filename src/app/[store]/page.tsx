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
import { showSection } from '@/lib/sections';
import { sectionWords } from '@/lib/section-copy';
import { buildTheme } from '@/lib/theme';
import { hasAppointments, hasWorkOrders, needsAgeGate } from '@/lib/business-type';

interface Props {
  params: { store: string };
}


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
  const presetHero = buildTheme(storefrontConfig).shape.heroStyle;
  const chosen = (storefrontConfig?.heroStyle || '').trim();
  const heroVariant = (['banner', 'split', 'minimal'].includes(chosen)
    ? chosen
    : presetHero) as 'banner' | 'split' | 'minimal';

  // The three bands a business type turns on. Their words were fixed English
  // written for a category rather than a shop, and one of them — the drinking
  // age — was fixed at 21, which is right in the United States and wrong
  // across most of the world. All three take the merchant's wording now, and
  // all three can be switched off like any other band.
  const bookingWords = sectionWords(storefrontConfig, 'appointmentsCta', {
    title: 'Book an Appointment',
    lede: 'Choose your service, staff, and time — online in seconds.',
    linkLabel: 'Book Now',
  });
  const trackWords = sectionWords(storefrontConfig, 'workOrderCta', {
    title: 'Track Your Order',
    lede: 'Enter your ticket number to see the status of your repair or job.',
    linkLabel: 'Track Order',
  });
  const ageWords = sectionWords(storefrontConfig, 'ageGate', {
    title: 'By shopping here you confirm you are old enough to buy alcohol where you live.',
  });

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
      {/* Age gate warning banner. The wording is the merchant's because the
          age is: 21 in the United States, 18 across most of Europe, and a
          shop that states the wrong one is making a claim about the law. */}
      {needsAgeGate(bt) && showSection(storefrontConfig, 'ageGate') && (
        <div className="bg-amber-50 border-b border-amber-200 py-2 px-4 text-center text-sm text-amber-800">
          {ageWords.title}
        </div>
      )}

      {/* The merchant's choice wins; otherwise the theme preset's, which has
          carried a heroStyle since presets existed and was never read. */}
      <HeroSection
        storefrontConfig={storefrontConfig}
        storeConfig={storeConfig}
        storeSlug={params.store}
        variant={heroVariant}
      />

      {/* Business-type CTAs */}
      {hasAppointments(bt) && showSection(storefrontConfig, 'appointmentsCta') && (
        <section className="bg-primary/5 border-b border-primary/10 py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-fg">{bookingWords.title}</h2>
              {bookingWords.lede && (
                <p className="text-sm text-fg-muted mt-0.5">{bookingWords.lede}</p>
              )}
            </div>
            <Link
              href={`/${params.store}/book`}
              className="flex-shrink-0 px-6 py-2.5 bg-primary-solid text-primary-foreground font-semibold rounded-brand hover:opacity-90 transition-opacity text-sm"
            >
              {bookingWords.linkLabel}
            </Link>
          </div>
        </section>
      )}

      {hasWorkOrders(bt) && !hasAppointments(bt)
        && showSection(storefrontConfig, 'workOrderCta') && (
        <section className="bg-surface-alt border-b border-line py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-fg">{trackWords.title}</h2>
              {trackWords.lede && (
                <p className="text-sm text-fg-muted mt-0.5">{trackWords.lede}</p>
              )}
            </div>
            <Link
              href={`/${params.store}/repairs`}
              className="flex-shrink-0 px-6 py-2.5 border border-primary text-primary font-semibold rounded-brand hover:bg-primary/5 transition-colors text-sm"
            >
              {trackWords.linkLabel}
            </Link>
          </div>
        </section>
      )}

      {/* Reassurance, immediately under the hero, where a first-time buyer
          looks before trusting a name they do not know. */}
      {showSection(storefrontConfig, 'trustBar') && (
        <TrustBar storefrontConfig={storefrontConfig} currency={storeConfig.currencyCode} />
      )}

      {shownCategories.length > 0 && showSection(storefrontConfig, 'categories') && (
        <section className="mx-auto max-w-7xl px-4 py-14 sm:py-20 lg:py-32 sm:px-6 lg:px-8">
          <SectionHeader
            {...sectionWords(storefrontConfig, 'categories', {
              eyebrow: 'Browse',
              title: hasAppointments(bt) ? 'Our Services' : 'Shop by category',
              lede: hasAppointments(bt)
                ? 'Book any of the services this store offers.'
                : 'Every department in the store, in one place.',
              linkLabel: 'All products',
            })}
            href={`/${params.store}/catalog`}
          />
          <CategoryGrid categories={shownCategories} storeSlug={params.store} />
        </section>
      )}

      {featured.length > 0 && showSection(storefrontConfig, 'featured') && (
        <section className="border-t border-line">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:py-20 lg:py-32 sm:px-6 lg:px-8">
            <SectionHeader
              {...sectionWords(storefrontConfig, 'featured', {
                eyebrow: 'Handpicked',
                title: hasAppointments(bt) ? 'Featured services' : 'Featured products',
                lede: 'Chosen by the store this week.',
                linkLabel: 'View all',
              })}
              href={`/${params.store}/catalog`}
            />
            <FeaturedProducts products={featured} storeSlug={params.store} />
          </div>
        </section>
      )}

      {spotlight && spotlight.items.length >= 2 && showSection(storefrontConfig, 'collection') && (
        <CollectionBand
          category={spotlight.category}
          products={spotlight.items}
          storeSlug={params.store}
          words={sectionWords(storefrontConfig, 'collection', { eyebrow: 'Collection' })}
        />
      )}

      {/* A different rhythm between the grids, so the page is not three lists
          stacked on top of each other. */}
      {showSection(storefrontConfig, 'editorial') && (
      <EditorialBand
        storeConfig={storeConfig}
        storeSlug={params.store}
        imageUrl={storefrontConfig?.heroImageUrl}
        stores={onlineStores(storefrontConfig)}
        words={sectionWords(storefrontConfig, 'editorial', {
          eyebrow: 'The store',
          linkLabel: 'Find a store',
        })}
      />
      )}
    </div>
  );
}
