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
  /**
   * Which of the three arrangements the band offers.
   *
   * It offered "Picture beside the products", "A grid" and "A row that
   * scrolls" and received NONE of them — `CollectionSection` never passed
   * `section.variant` down, so all three drew the split. A merchant picked
   * a carousel, was told it saved, and got the same page back.
   *
   * `split` is first in the catalogue and so is the fallback; keeping it as
   * the default here means a shop that predates this renders unchanged.
   */
  variant?: 'split' | 'grid' | 'carousel';
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
export function CollectionBand({
  category, products, storeSlug, words, variant = 'split',
}: Props) {
  // A grid and a rail are worth more than three things; the split is a
  // composition built around exactly three.
  const picks = products.slice(0, variant === 'split' ? 3 : 8);
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
              because the heading above and the link below both name it.
              The split's own flourish — a grid or a rail is a listing, and
              type at that size behind one is just noise. */}
          {variant === 'split' && (
            <h2
              aria-hidden
              className="display-hero pointer-events-none hidden select-none whitespace-nowrap text-fg/[0.07] lg:block"
            >
              {heading}
              <span className="text-outline ms-4">{heading}</span>
            </h2>
          )}

          {/* Pulled up into the type on wide screens only — there is nothing
              to overlap on a phone.

              `lg:mt-0` used to sit here beside `lg:-mt-24`. Two margin
              utilities at one breakpoint, and the one that won was whichever
              Tailwind happened to emit last: `margin-top: 0px`, measured in
              the browser. So the band's whole move — cards riding up into
              the outlined word behind them — had never once happened, and
              the comment above described something nobody had seen. */}
          <div className={
            variant === 'carousel'
              // A row that scrolls. The cards keep a width of their own and
              // the track bleeds to the page edge, as the featured rail does.
              ? 'mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 scrollbar-hide sm:gap-6 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8'
              : variant === 'grid'
                // A grid, and no pull-up: the type it would ride into is not
                // drawn for this arrangement.
                ? 'mt-8 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4'
                : 'mt-8 grid grid-cols-2 gap-4 sm:gap-6 lg:-mt-24 lg:grid-cols-3'
          }>
            {picks.map((product, i) => (
              <Link
                key={product.id}
                href={`/${storeSlug}/product/${product.id}`}
                className={
                  variant === 'carousel'
                    // In a rail every card is the same and keeps its width.
                    ? 'group block flex-shrink-0 snap-start w-[60vw] sm:w-[34vw] lg:w-[18rem]'
                    : variant === 'grid'
                      // In a grid every card is the same, and none is hidden:
                      // the split hides its third below `lg` because the
                      // stagger needs three abreast to read as a composition.
                      ? 'group block'
                      : 'group block ' +
                        // The middle card sits lower, so the row is a
                        // composition rather than three things in a line.
                        (i === 1 ? 'lg:mt-16'
                          : i === 2 ? 'hidden lg:block lg:mt-6' : '')
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
