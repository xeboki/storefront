import { ProductCard } from './ProductCard';
import type { OrderingProduct } from '@xeboki/sdk';

interface Props {
  products: OrderingProduct[];
  storeSlug: string;
}

export function ProductGrid({ products, storeSlug }: Props) {
  if (products.length === 0) {
    return (
      <div className="text-center py-16 text-fg-subtle">
        <p className="text-lg font-medium">No products found</p>
        <p className="text-sm mt-1">Check back soon!</p>
      </div>
    );
  }

  return (
    // `stagger` drops every second column on wide screens. A grid where every
    // top edge lines up reads as a spreadsheet; breaking the baseline is what
    // makes a wall of products look arranged rather than dumped. The extra
    // bottom padding is the room the offset column needs.
    <div className="stagger grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-6 lg:pb-14">
      {products.map((product, index) => (
        <div
          key={product.id}
          className="animate-rise"
          // Staggered so the grid resolves as a wave instead of one flash.
          // Capped: past a dozen cards the delay stops reading as rhythm and
          // starts reading as the page being slow.
          style={{ animationDelay: `${Math.min(index, 11) * 40}ms` }}
        >
          <ProductCard product={product} storeSlug={storeSlug} index={index} />
        </div>
      ))}
    </div>
  );
}
