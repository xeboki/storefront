/**
 * The bands this storefront already drew, as sections.
 *
 * Ported, not rewritten: each wraps the component the page called directly,
 * so a shop that has arranged nothing gets the page it already had. That
 * compatibility is the one thing it would be unforgivable to break on
 * deploy — every shop on the internet has no arrangement saved.
 *
 * What is new is the variant. The band that was always a grid can be a row
 * that scrolls; the band whose picture was always on the right can flip.
 */
import Link from 'next/link';
import { FeaturedProducts } from '@/components/product/FeaturedProducts';
import { CategoryGrid } from '@/components/product/CategoryGrid';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { TrustBar } from '@/components/layout/TrustBar';
import { EditorialBand } from '@/components/layout/EditorialBand';
import { CollectionBand } from '@/components/layout/CollectionBand';
import { HeroSlideshow } from '@/components/layout/HeroSlideshow';
import { ScrollRail } from '@/components/layout/ScrollRail';
import { resolveSlides } from '@/lib/hero-slides';
import { buildTheme } from '@/lib/theme';
import { bandWords, setting } from '@/lib/band-words';
import { hasAppointments } from '@/lib/business-type';
import { onlineStores } from '@/lib/location';
import { Band } from './Band';
import { ProductTabs } from './ProductTabs';
import type { SectionProps } from '../types';

export function HeroBand({ section, ctx, nested }: SectionProps) {
  const slides = resolveSlides(ctx.storefrontConfig, ctx.storeConfig, ctx.storeSlug);
  const slideshow = ctx.storefrontConfig?.heroSlideshow;
  // The preset has carried a hero treatment since presets existed. Order of
  // precedence: this band's variant, then the slideshow module, then the
  // preset — most specific decision first.
  const presetHero = buildTheme(ctx.storefrontConfig).shape.heroStyle;
  const presetLayout = presetHero === 'banner' ? 'full' : presetHero;
  const settings = {
    ...(slideshow ?? {
      layout: presetLayout, transition: 'slide', imageMotion: 'none',
      interval: 'normal', indicator: 'dots', arrows: true, height: 'adapt',
      mobileText: 'over', pauseOnHover: true, loop: true, maxSlides: 8,
    }),
    layout: section.variant || slideshow?.layout || presetLayout,
  };
  return <HeroSlideshow slides={slides} settings={settings} />;
}

export function TrustBand({ section, ctx, nested }: SectionProps) {
  const variant = section.variant === 'plain' || section.variant === 'compact'
    ? section.variant
    : 'icons';
  return (
    <TrustBar
      storefrontConfig={ctx.storefrontConfig}
      currency={ctx.storeConfig.currencyCode}
      variant={variant}
    />
  );
}

export function CategoriesBand({ section, ctx, nested }: SectionProps) {
  const booking = hasAppointments(ctx.storeConfig.businessType);
  const limit = setting<number>(section, 'limit', 0);
  const chosen = setting<string[]>(section, 'categoryIds', []);
  const pool = chosen.length
    ? chosen.map((id) => ctx.categories.find((c) => c.id === id))
        .filter((c): c is NonNullable<typeof c> => Boolean(c))
    : ctx.shownCategories;
  const list = limit > 0 ? pool.slice(0, limit) : pool;
  if (list.length === 0) return null;

  // How many things are actually in a department.
  //
  // NOT `category.productCount`: that is a denormalised counter on the
  // category document which nothing maintains, so it reads 0 for every
  // department on every shop — and "0 items" under each tile makes a stocked
  // shop look empty. Counted from the catalogue this page already loaded,
  // and shown only when there is something to say, because a fabricated zero
  // is worse than no number at all.
  const countIn = (categoryId: string) =>
    ctx.products.filter((p) => p.categoryId === categoryId).length;
  const items = (n: number) => `${n} item${n === 1 ? '' : 's'}`;

  const words = bandWords(section, {
    eyebrow: 'Browse',
    title: booking ? 'Our Services' : 'Shop by category',
    lede: booking
      ? 'Book any of the services this store offers.'
      : 'Every department in the store, in one place.',
    linkLabel: 'All products',
  });

  return (
    <Band nested={nested} bordered={false}>
      <SectionHeader {...words} href={`/${ctx.storeSlug}/catalog`} />
      {section.variant === 'carousel' ? (
        <ScrollRail trackClassName="flex gap-4 pb-2">
          {list.map((c) => (
            <Link
              key={c.id}
              href={`/${ctx.storeSlug}/catalog?category=${c.id}`}
              className="flex-none w-44 rounded-brand border border-line bg-surface p-5 text-center transition-colors hover:border-primary"
            >
              <span className="text-sm font-semibold text-fg">{c.name}</span>
              <span className="mt-1 block min-h-[1rem] text-xs text-fg-muted">
                {countIn(c.id) > 0 ? items(countIn(c.id)) : '\u00a0'}
              </span>
            </Link>
          ))}
        </ScrollRail>
      ) : section.variant === 'list' ? (
        <ul className="divide-y divide-line border-y border-line">
          {list.map((c) => (
            <li key={c.id}>
              <Link
                href={`/${ctx.storeSlug}/catalog?category=${c.id}`}
                className="flex items-center justify-between py-4 text-fg transition-colors hover:text-primary"
              >
                <span className="font-medium">{c.name}</span>
                {countIn(c.id) > 0 && (
                  <span className="text-sm text-fg-muted">{countIn(c.id)}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      ) : section.variant === 'tiles' ? (
        // Big tiles in the department's own colour.
        //
        // Colour, not a photograph: a category carries `color` and has never
        // carried an image, so a picture tile would be an empty frame on
        // every shop. A department that has chosen no colour gets the page's
        // own surface and its name — it keeps its place either way, because
        // dropping it would hide part of the shop.
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {list.map((c) => (
            <Link
              key={c.id}
              href={`/${ctx.storeSlug}/catalog?category=${c.id}`}
              style={c.color ? { backgroundColor: c.color } : undefined}
              className={`group flex aspect-[4/3] flex-col justify-end rounded-brand p-5 transition-transform hover:-translate-y-0.5 ${
                c.color ? 'text-white' : 'border border-line bg-surface-alt text-fg'}`}
            >
              <span className="text-lg font-bold leading-tight">{c.name}</span>
              {/* The line is kept whether or not there is a count to put in
                  it. Without it, a department with nothing filed under it
                  sat a line lower than the one beside it, so a row of tiles
                  had its names at two different heights. */}
              <span className={`mt-1 min-h-[1.25rem] text-sm ${
                c.color ? 'text-white/80' : 'text-fg-muted'}`}>
                {countIn(c.id) > 0 ? items(countIn(c.id)) : '\u00a0'}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <CategoryGrid categories={list} storeSlug={ctx.storeSlug} />
      )}
    </Band>
  );
}

export function FeaturedBand({ section, ctx, nested }: SectionProps) {
  const limit = setting<number>(section, 'limit', 0);
  const chosen = setting<string[]>(section, 'productIds', []);
  const pool = chosen.length
    ? chosen.map((id) => ctx.products.find((p) => p.id === id))
        .filter((p): p is NonNullable<typeof p> => Boolean(p))
    : ctx.featured;
  const list = limit > 0 ? pool.slice(0, limit) : pool;
  if (list.length === 0) return null;

  const booking = hasAppointments(ctx.storeConfig.businessType);
  const words = bandWords(section, {
    eyebrow: 'Handpicked',
    title: booking ? 'Featured services' : 'Featured products',
    lede: 'Chosen by the store this week.',
    linkLabel: 'View all',
  });

  // Named selections over one grid — "New / Featured / All" — instead of
  // three bands a shopper scrolls past. The merchant names the tabs; what
  // each holds is derived from the catalogue this page already has, so a tab
  // costs no round trip.
  const tabNames = setting<string[]>(section, 'tabs', []).filter(Boolean);
  const shown = section.variant === 'wide' ? list.slice(0, 4) : list;

  return (
    <Band nested={nested}>
      <SectionHeader {...words} href={`/${ctx.storeSlug}/catalog`} />
      {tabNames.length > 1 ? (
        <ProductTabs
          storeSlug={ctx.storeSlug}
          inset={nested}
          tabs={tabNames.map((label, i) => ({
            label,
            // The first tab is the merchant's own selection; the rest are
            // slices of the catalogue behind it, so naming a tab never leaves
            // it empty. A shop wanting genuinely different lists gives each
            // one its own band.
            products: i === 0 ? shown : ctx.products.slice(i * shown.length, (i + 1) * shown.length),
          })).filter((t) => t.products.length > 0)}
        />
      ) : (
        <FeaturedProducts products={shown} storeSlug={ctx.storeSlug} inset={nested} />
      )}
    </Band>
  );
}

export function CollectionSection({ section, ctx, nested }: SectionProps) {
  // The merchant's chosen department, else whichever has the most to show — a
  // composition built around a department holding two things is a thin one.
  const chosen = setting<string>(section, 'categoryId', '');
  const pools = ctx.shownCategories
    .filter((c) => c.id !== '_uncategorized')
    .map((c) => ({ category: c, items: ctx.products.filter((p) => p.categoryId === c.id) }));
  const spotlight = chosen
    ? pools.find((p) => p.category.id === chosen)
    : [...pools].sort((a, b) => b.items.length - a.items.length)[0];
  if (!spotlight || spotlight.items.length < 2) return null;
  return (
    <CollectionBand
      category={spotlight.category}
      products={spotlight.items}
      storeSlug={ctx.storeSlug}
      words={bandWords(section, { eyebrow: 'Collection' })}
    />
  );
}

export function EditorialSection({ section, ctx, nested }: SectionProps) {
  return (
    <EditorialBand
      storeConfig={ctx.storeConfig}
      storeSlug={ctx.storeSlug}
      imageUrl={setting<string>(section, 'imageUrl', '')
        || ctx.storefrontConfig?.heroImageUrl || ''}
      stores={onlineStores(ctx.storefrontConfig)}
      words={bandWords(section, { eyebrow: 'The store', linkLabel: 'Find a store' })}
      flip={section.variant === 'imageLeft'}
    />
  );
}
