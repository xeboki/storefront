import { ProductCard } from './ProductCard';
import type { OrderingProduct } from '@xeboki/sdk';

interface Props {
  products: OrderingProduct[];
  storeSlug: string;
}

export function FeaturedProducts({ products, storeSlug }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} storeSlug={storeSlug} />
      ))}
    </div>
  );
}
