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
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {products.map((product, index) => (
        <div
          key={product.id}
          className="animate-rise"
          // Staggered so the grid resolves as a wave instead of one flash.
          // Capped: past a dozen cards the delay stops reading as rhythm and
          // starts reading as the page being slow.
          style={{ animationDelay: `${Math.min(index, 11) * 40}ms` }}
        >
          <ProductCard product={product} storeSlug={storeSlug} />
        </div>
      ))}
    </div>
  );
}
