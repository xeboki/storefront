import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { OrderingCategory, OrderingProduct } from '@xeboki/sdk';
import { ProductImage } from '@/components/product/ProductImage';
import type { SectionWords } from '@/lib/section-copy';
import { BAND_RHYTHM } from '@/components/home/bands/Band';

interface Props {
  category: OrderingCategory;
  products: OrderingProduct[];
  storeSlug: string;
  /** The merchant's wording. Blank fields fall back to the category's name. */
  words: SectionWords;
}

/**
 * One department, with its name used as the artwork.
 *
 * Every other band on this page is a heading followed by a row of things. This
 * one sets the category name at the size of an image and lets three products
 * overlap it, so the page has a moment that is composed rather than listed —
 * and it costs no photography to look deliberate, which matters for a shop
 * that has not shot a campaign.
 */
export function CollectionBand({ category, products, storeSlug, words }: Props) {
  const picks = products.slice(0, 3);
  if (picks.length === 0) return null;

  const href = `/${storeSlug}/catalog?category=${category.id}`;
  // The name is the artwork here, so an override replaces it everywhere it is
  // set — the ghost type, the phone heading and the link all read the same word.
  const heading = words.title || category.name;

  return (
    <section className={`relative overflow-hidden ${BAND_RHYTHM}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative">
          {/* A phone gets a heading it can read. The ghost treatment below
              depends entirely on scale: at 50px and 7% opacity it is not a
              design element, it is an empty band with two cards in it — which
              is exactly how it looked. */}
          <div className="lg:hidden">
            {words.eyebrow && (
              <p className="eyebrow eyebrow-rule text-primary">{words.eyebrow}</p>
            )}
            <h2 className="display-lg mt-3 text-fg">{heading}</h2>
          </div>

          {/* Wide screens: the name at the size of an image. aria-hidden
              because the heading above and the link below both name it. */}
          <h2
            aria-hidden
            className="display-hero pointer-events-none hidden select-none whitespace-nowrap text-fg/[0.07] lg:block"
          >
            {heading}
            <span className="text-outline ms-4">{heading}</span>
          </h2>

          {/* Pulled up into the type on wide screens only — there is nothing
              to overlap on a phone.

              `lg:mt-0` used to sit here beside `lg:-mt-24`. Two margin
              utilities at one breakpoint, and the one that won was whichever
              Tailwind happened to emit last: `margin-top: 0px`, measured in
              the browser. So the band's whole move — cards riding up into
              the outlined word behind them — had never once happened, and
              the comment above described something nobody had seen. */}
          <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 lg:-mt-24 lg:grid-cols-3">
            {picks.map((product, i) => (
              <Link
                key={product.id}
                href={`/${storeSlug}/product/${product.id}`}
                className={
                  'group block ' +
                  // The middle card sits lower, so the row is a composition
                  // rather than three things in a line.
                  (i === 1 ? 'lg:mt-16' : i === 2 ? 'hidden lg:block lg:mt-6' : '')
                }
              >
                <div className="relative aspect-[3/4] overflow-hidden rounded-brand bg-surface-alt shadow-2xl">
                  <ProductImage
                    src={product.imageUrl}
                    alt={product.name}
                    fill
                    sizes="(max-width: 1024px) 45vw, 30vw"
                    className="object-cover motion-safe:transition-transform motion-safe:duration-[900ms] motion-safe:group-hover:scale-105"
                    fallback={<span className="absolute inset-0 bg-surface-alt" />}
                  />
                </div>
                <p className="mt-3 truncate text-sm font-medium text-fg">{product.name}</p>
              </Link>
            ))}
          </div>

          <div className="mt-12">
            <Link
              href={href}
              className="group inline-flex items-center gap-2 border-b border-fg/30 pb-1 text-sm font-semibold uppercase tracking-[0.12em] text-fg transition-colors hover:border-primary hover:text-primary"
            >
              {words.linkLabel || `All ${heading}`}
              <ArrowUpRight
                size={16}
                className="motion-safe:transition-transform motion-safe:group-hover:-translate-y-0.5 motion-safe:group-hover:translate-x-0.5"
              />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
