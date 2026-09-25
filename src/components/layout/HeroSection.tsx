import Link from 'next/link';
import { storeName } from '@/lib/store-name';
import { ArrowRight } from 'lucide-react';
import type { StoreConfig, StorefrontConfig } from '@xeboki/sdk';
import { ProductImage } from '@/components/product/ProductImage';
import { showSection } from '@/lib/sections';

interface Props {
  storefrontConfig: StorefrontConfig | null;
  storeConfig: StoreConfig;
  storeSlug: string;
  /** From the theme preset, overridden by the merchant's own setting. */
  variant?: 'banner' | 'split' | 'minimal';
}

/**
 * The hero.
 *
 * It was a flat band of the brand colour with the text pushed into the left
 * third and two-thirds of dead space beside it — the emptiest thing on the
 * page and the first thing anyone saw.
 *
 * Now: a full-bleed image when the merchant has set one, and when they have
 * not, a composed gradient with a soft radial bloom rather than one solid
 * rectangle. The copy sits in a column that stops at a readable measure, with
 * an eyebrow rule above it and a solid CTA.
 *
 * The copy is WHITE over a scrim rather than `primary-foreground`. Deriving it
 * from the brand colour is right for a flat button, but a hero is a gradient
 * or a photograph: for a mid-tone brand like emerald, `readableOn` correctly
 * returns dark — and dark type then vanishes into the darker end of its own
 * gradient. A scrim plus white is what makes the headline legible over
 * anything a merchant uploads, which is the only guarantee worth having here.
 */
export function HeroSection({
  storefrontConfig, storeConfig, storeSlug, variant = 'banner',
}: Props) {
  const title = storefrontConfig?.heroTitle || storeName(storeConfig);
  const subtitle = storefrontConfig?.heroSubtitle || 'Shop our latest products';
  const bgImage = storefrontConfig?.heroImageUrl;

  // The Design screen has written these two since it shipped and nothing ever
  // read them, so a merchant could set a call to action and watch the hero go
  // on saying "Shop now". A relative path is kept inside this store's prefix —
  // a merchant typing "/catalog" means their catalogue, not the site root.
  const inStore = (url: string, fallback: string) => {
    const trimmed = url.trim();
    if (!trimmed) return fallback;
    if (/^(https?:)?\/\//.test(trimmed) || trimmed.startsWith('mailto:') || trimmed.startsWith('tel:')) {
      return trimmed;
    }
    const path = trimmed.replace(/^\/+/, '');
    // The Design screen shipped with '/products' pre-filled in the CTA URL
    // field, and this storefront's catalogue is at /catalog. Every shop that
    // saved that screen without editing the box holds a link to a page that
    // does not exist — which nobody noticed, because nothing read the field.
    return `/${storeSlug}/${path === 'products' ? 'catalog' : path}`;
  };

  const ctaLabel = (storefrontConfig?.heroCtaText || '').trim() || 'Shop now';
  const ctaHref = inStore(storefrontConfig?.heroCtaUrl || '', `/${storeSlug}/catalog`);
  // The second button is a band like any other, so it is switched off the same
  // way. A blank label cannot mean "hide": every store configured before this
  // existed has one, and they would all silently lose the button.
  const showSecond = showSection(storefrontConfig, 'heroSecondaryCta');
  const secondLabel = (storefrontConfig?.heroSecondaryCtaText || '').trim() || 'Find a store';
  const secondHref = inStore(storefrontConfig?.heroSecondaryCtaUrl || '', `/${storeSlug}/locations`);

  // `minimal` is a short band for shops whose product photography should start
  // above the fold; `split` centres the copy on a narrower measure. Both were
  // declared in the presets from the start and never read.
  const height =
    variant === 'minimal'
      ? 'py-12 sm:py-16 lg:py-20'
      : variant === 'split'
      ? 'py-14 sm:py-20 md:py-24 lg:py-28'
      : 'py-16 sm:py-20 md:py-28 lg:px-8 lg:py-36';
  const column = variant === 'split' ? 'mx-auto max-w-2xl text-center' : 'max-w-xl';

  return (
    <section className="relative isolate overflow-hidden bg-primary">
      {/* Photography, when there is any. Darkened so type stays readable over
          whatever the merchant uploads — we cannot know if it is a pale
          studio shot or a night scene. */}
      {bgImage && (
        <>
          <ProductImage
            src={bgImage}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
            fallback={null}
          />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
        </>
      )}

      {/* No image: build depth out of the brand colour instead of a flat fill.
          The dark wash on the left is what guarantees the copy is legible —
          see the note on text colour below. */}
      {!bgImage && (
        <div aria-hidden className="absolute inset-0">
          <div className="absolute -left-1/4 top-[-30%] h-[130%] w-[70%] rounded-full bg-white/10 blur-3xl" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/25 to-transparent" />
        </div>
      )}

      <div className={`relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 ${height}`}>
        <div className={column}>
          <p className="eyebrow eyebrow-rule text-white/70">
            {storeName(storeConfig)}
          </p>

          <h1 className="display-xl mt-5 text-white drop-shadow-sm">{title}</h1>

          {subtitle && (
            <p className={`mt-5 text-lg leading-relaxed text-white/85 ${
              variant === 'split' ? 'mx-auto max-w-lg' : 'max-w-md'
            }`}>
              {subtitle}
            </p>
          )}

          <div className={`mt-7 flex flex-wrap items-center gap-3 sm:mt-9 ${
            variant === 'split' ? 'justify-center' : ''
          }`}>
            <Link
              href={ctaHref}
              className="lift group inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold uppercase tracking-wider text-slate-900 shadow-lg"
            >
              {ctaLabel}
              <ArrowRight
                size={16}
                className="motion-safe:transition-transform motion-safe:group-hover:translate-x-1"
              />
            </Link>
            {showSecond && (
              <Link
                href={secondHref}
                className="inline-flex items-center gap-2 rounded-full border border-white/35 px-7 py-3.5 text-sm font-semibold uppercase tracking-wider text-white transition-colors hover:border-white/80 hover:bg-white/10"
              >
                {secondLabel}
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
