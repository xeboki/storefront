import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { OrderingCategory, OrderingProduct } from '@xeboki/sdk';
import { ProductImage } from '@/components/product/ProductImage';

interface Props {
  category: OrderingCategory;
  products: OrderingProduct[];
  storeSlug: string;
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
export function CollectionBand({ category, products, storeSlug }: Props) {
  const picks = products.slice(0, 3);
  if (picks.length === 0) return null;

  const href = `/${storeSlug}/catalog?category=${category.id}`;

  return (
    <section className="relative overflow-hidden border-t border-line py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative">
          {/* The word. aria-hidden because the link below already names it —
              a screen reader should not hear the category twice. */}
          <h2
            aria-hidden
            className="display-hero pointer-events-none select-none whitespace-nowrap text-fg/[0.07]"
          >
            {category.name}
            <span className="text-outline ml-4 hidden sm:inline">{category.name}</span>
          </h2>

          {/* Pulled up into the type so the two layers occupy one space. */}
          <div className="-mt-10 grid grid-cols-2 gap-4 sm:gap-6 lg:-mt-24 lg:grid-cols-3">
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
              All {category.name}
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
