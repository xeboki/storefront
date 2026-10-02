'use client';

/**
 * The featured selection, as a rail rather than a second grid.
 *
 * The home page ran hero → grid → grid → footer, and two grids one under the
 * other is what makes a shop feel like a spreadsheet with pictures. A rail
 * changes the rhythm: the cards are large enough to actually look at, the row
 * runs off the right edge so it reads as a selection rather than an inventory,
 * and it is the same gesture a phone already expects.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, ShoppingCart } from 'lucide-react';
import type { OrderingProduct } from '@xeboki/sdk';
import { ProductImage } from './ProductImage';
import { useMoney } from '@/lib/currency';
import { productIsSellable } from '@/lib/availability';

interface Props {
  products: OrderingProduct[];
  storeSlug: string;
  /**
   * Inside a column rather than across the page.
   *
   * The row bleeds to the page edge by negative margin, which is right for a
   * full-width band and wrong in a column — it pulls the cards out of the
   * column they were given. The card width comes down too: 24rem is a third
   * of the page and the whole of a narrow column.
   */
  inset?: boolean;
  /**
   * How the products are laid out.
   *
   * This component was a scrolling row and nothing else, while the band
   * above it offered "A grid", "A row that scrolls" and "Fewer, larger".
   * Only the last one branched — on the COUNT — so a merchant who picked
   * "A grid" was given the row, and `grid` and `carousel` rendered
   * byte-for-byte the same page.
   */
  layout?: 'carousel' | 'grid';
}

export function FeaturedProducts({
  products, storeSlug, inset = false, layout = 'carousel',
}: Props) {
  const grid = layout === 'grid';
  const money = useMoney();
  const track = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 1);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    measure();
    el.addEventListener('scroll', measure, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', measure);
      ro.disconnect();
    };
  }, [measure]);

  function nudge(dir: -1 | 1) {
    const el = track.current;
    if (!el) return;
    // One card plus its gap, so a press always lands on a card edge.
    const step = (el.firstElementChild as HTMLElement | null)?.offsetWidth ?? 320;
    el.scrollBy({ left: dir * (step + 24), behavior: 'smooth' });
  }

  const arrow =
    'flex h-10 w-10 items-center justify-center rounded-full border border-line text-fg transition-colors hover:border-fg disabled:opacity-25 disabled:hover:border-line';

  return (
    <div>
      <div
        ref={track}
        className={grid
          // A grid wraps and bleeds nowhere: the negative margin that lets a
          // row run to the page edge would pull a grid's first column out of
          // the measure the rest of the page keeps to.
          ? `grid grid-cols-2 gap-6 ${inset ? 'lg:grid-cols-2' : 'lg:grid-cols-4'}`
          : `flex snap-x snap-mandatory gap-6 overflow-x-auto pb-2 scrollbar-hide ${
              inset ? '' : '-mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8'}`}
      >
        {products.map((product, index) => {
          const sellable = productIsSellable(product);
          return (
            <Link
              key={product.id}
              href={`/${storeSlug}/product/${product.id}`}
              className={grid
                ? 'group'
                : `group flex-shrink-0 snap-start ${
                    inset ? 'w-[68vw] sm:w-[38vw] lg:w-[15rem]'
                          : 'w-[72vw] sm:w-[44vw] lg:w-[24rem]'}`}
            >
              <div className="relative aspect-[4/5] overflow-hidden rounded-brand bg-surface-alt">
                <ProductImage
                  src={product.imageUrl}
                  alt={product.name}
                  fill
                  sizes="(max-width: 640px) 72vw, (max-width: 1024px) 44vw, 24rem"
                  className="object-cover motion-safe:transition-transform motion-safe:duration-[900ms] motion-safe:ease-out motion-safe:group-hover:scale-[1.05]"
                  fallback={
                    <div className="absolute inset-0 flex items-center justify-center text-fg-subtle/40">
                      <ShoppingCart size={44} strokeWidth={1} />
                    </div>
                  }
                />
                {/* Oversized index, half off the bottom edge — the detail that
                    makes a row read as a curated selection. */}
                <span
                  aria-hidden
                  className="price pointer-events-none absolute -bottom-5 start-3 text-[5rem] font-medium leading-none text-white/25"
                  style={{ textShadow: '0 2px 20px rgba(0,0,0,0.35)' }}
                >
                  {String(index + 1).padStart(2, '0')}
                </span>
                {!sellable && (
                  <>
                    <span aria-hidden className="absolute inset-0 bg-bg/55" />
                    <span className="absolute start-4 top-4 bg-fg px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-bg">
                      Sold out
                    </span>
                  </>
                )}
              </div>

              <div className="flex items-baseline justify-between gap-4 pt-4">
                <div className="min-w-0">
                  {/* The line is kept even when the product has no
                      category. Dropping it moved that card's NAME up to
                      where its neighbours' category sits, so a row of cards
                      had its names on two different baselines — and which
                      ones depended on whether somebody had filed the product
                      anywhere. */}
                  <p className="eyebrow text-[9px]">
                    {product.categoryName || '\u00a0'}
                  </p>
                  <h3 className="mt-1 truncate text-base font-medium text-fg transition-colors group-hover:text-primary">
                    {product.name}
                  </h3>
                </div>
                <p className="price flex-shrink-0 text-sm text-fg-muted">
                  {product.hasVariants && <span className="me-1 text-xs">From</span>}
                  {money(product.price ?? 0)}
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Controls sit under the rail, not floating over the images — and a
          grid has no rail to nudge, so it has no controls either. */}
      <div className={`mt-8 items-center gap-3 ${grid ? 'hidden' : 'flex'}`}>
        <button type="button" onClick={() => nudge(-1)} disabled={atStart}
                aria-label="Previous" className={arrow}>
          <ArrowLeft size={16} />
        </button>
        <button type="button" onClick={() => nudge(1)} disabled={atEnd}
                aria-label="Next" className={arrow}>
          <ArrowRight size={16} />
        </button>
        <span className="price ms-2 text-xs uppercase tracking-[0.14em] text-fg-subtle">
          {String(products.length).padStart(2, '0')} items
        </span>
      </div>
    </div>
  );
}
