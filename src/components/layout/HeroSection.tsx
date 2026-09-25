import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { StoreConfig, StorefrontConfig } from '@xeboki/sdk';
import { ProductImage } from '@/components/product/ProductImage';

interface Props {
  storefrontConfig: StorefrontConfig | null;
  storeConfig: StoreConfig;
  storeSlug: string;
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
export function HeroSection({ storefrontConfig, storeConfig, storeSlug }: Props) {
  const title = storefrontConfig?.heroTitle || storeConfig.businessName;
  const subtitle = storefrontConfig?.heroSubtitle || 'Shop our latest products';
  const bgImage = storefrontConfig?.heroImageUrl;

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

      <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 md:py-28 lg:px-8 lg:py-36">
        <div className="max-w-xl">
          <p className="eyebrow eyebrow-rule text-white/70">
            {storeConfig.businessName}
          </p>

          <h1 className="display-xl mt-5 text-white drop-shadow-sm">{title}</h1>

          {subtitle && (
            <p className="mt-5 max-w-md text-lg leading-relaxed text-white/85">
              {subtitle}
            </p>
          )}

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href={`/${storeSlug}/catalog`}
              className="lift group inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold uppercase tracking-wider text-slate-900 shadow-lg"
            >
              Shop now
              <ArrowRight
                size={16}
                className="motion-safe:transition-transform motion-safe:group-hover:translate-x-1"
              />
            </Link>
            <Link
              href={`/${storeSlug}/locations`}
              className="inline-flex items-center gap-2 rounded-full border border-white/35 px-7 py-3.5 text-sm font-semibold uppercase tracking-wider text-white transition-colors hover:border-white/80 hover:bg-white/10"
            >
              Find a store
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
