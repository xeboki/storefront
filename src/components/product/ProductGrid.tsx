import { ProductCard } from './ProductCard';
import type { OrderingProduct } from '@xeboki/sdk';

interface Props {
  products: OrderingProduct[];
  storeSlug: string;
}

export function ProductGrid({ products, storeSlug }: Props) {
  if (products.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <p className="text-lg font-medium">No products found</p>
        <p className="text-sm mt-1">Check back soon!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} storeSlug={storeSlug} />
      ))}
    </div>
  );
}
