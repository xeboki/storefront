'use client';

import Link from 'next/link';
import { ProductImage } from './ProductImage';
import { ShoppingCart, Heart } from 'lucide-react';
import { clsx } from 'clsx';
import { toast } from 'react-hot-toast';
import { useCartStore } from '@/stores/cartStore';
import { useWishlistStore } from '@/stores/wishlistStore';
import { formatCurrency } from '@/lib/utils';
import { useMoney } from '@/lib/currency';
import { trackAddToCart } from '@/lib/analytics';
import { productIsSellable } from '@/lib/availability';
import { useStoreConfigStore } from '@/stores/storeConfigStore';
import type { OrderingProduct } from '@xeboki/sdk';

interface Props {
  product: OrderingProduct;
  storeSlug: string;
}

export function ProductCard({ product, storeSlug }: Props) {
  const money = useMoney();
  // A card only ever quick-adds a product with no variations, so its own pool
  // is the right question. "Sold Out" used to mean `isActive === false` alone,
  // which said nothing about whether the shop had any.
  const sellable = productIsSellable(product);
  const addItem = useCartStore((s) => s.addItem);
  const addToWishlist = useWishlistStore((s) => s.addItem);
  const removeFromWishlist = useWishlistStore((s) => s.removeItem);
  const isWishlisted = useWishlistStore((s) => s.isWishlisted(product.id, storeSlug));

  function handleToggleWishlist(e: React.MouseEvent) {
    e.preventDefault();
    if (isWishlisted) {
      removeFromWishlist(product.id, storeSlug);
      toast.success('Removed from wishlist');
    } else {
      addToWishlist({
        productId: product.id,
        name: product.name,
        price: product.price ?? 0,
        imageUrl: product.imageUrl ?? undefined,
        storeSlug,
      });
      toast.success('Saved to wishlist');
    }
  }

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    if (product.hasVariants) {
      window.location.href = `/${storeSlug}/product/${product.id}`;
      return;
    }
    addItem({
      productId: product.id,
      name: product.name,
      imageUrl: product.imageUrl ?? undefined,
      price: product.price ?? 0,
      modifiers: [],
      modifierLabels: [],
    });
    trackAddToCart(
      { id: product.id, name: product.name, price: product.price ?? 0, quantity: 1, category: product.categoryName },
      useStoreConfigStore.getState().currencyCode,
    );
    toast.success(`${product.name} added to cart`);
  }

  // Use product ID as slug — getProductBySlug falls back to ID on the API side
  const href = `/${storeSlug}/product/${product.id}`;

  return (
    <Link href={href} className="group block">
      <div className="lift flex h-full flex-col overflow-hidden rounded-brand-lg border border-line bg-surface hover:border-primary/40 hover:shadow-xl">
        <div className="relative aspect-[4/5] overflow-hidden bg-surface-alt">
          <ProductImage
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 50vw, 25vw"
            fallback={
              <div className="absolute inset-0 flex items-center justify-center text-fg-subtle">
                <ShoppingCart size={48} />
              </div>
            }
          />

          {/* A corner badge and a faded image, rather than a scrim with a pill
              floating in the middle of the picture — that read as an error
              state and hid the product a shopper was trying to look at. */}
          {!sellable && (
            <>
              <span aria-hidden className="absolute inset-0 bg-surface/55" />
              <span className="absolute left-3 top-3 rounded-full bg-fg px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-bg">
                Sold out
              </span>
            </>
          )}

          {/* Wishlist button */}
          <button
            onClick={handleToggleWishlist}
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
            className={clsx(
              'absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full shadow-sm backdrop-blur transition-colors',
              isWishlisted
                ? 'bg-rose-50 text-rose-500'
                : 'bg-surface/90 text-fg-subtle hover:text-rose-500',
            )}
          >
            <Heart size={14} className={isWishlisted ? 'fill-rose-500' : ''} />
          </button>
        </div>

        <div className="flex flex-1 flex-col p-4">
          {product.categoryName && (
            <p className="eyebrow mb-1.5 text-[10px]">{product.categoryName}</p>
          )}
          <h3 className="line-clamp-2 text-sm font-medium leading-snug text-fg">
            {product.name}
          </h3>

          <div className="mt-auto flex items-end justify-between gap-2 pt-3">
            <span className="price text-base font-semibold text-fg">
              {product.hasVariants && (
                <span className="mr-1 text-xs font-normal text-fg-muted">From</span>
              )}
              {money(product.price ?? 0)}
            </span>

            {sellable && !product.hasVariants && (
              <button
                onClick={handleAddToCart}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90"
                aria-label="Add to cart"
              >
                <ShoppingCart size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
