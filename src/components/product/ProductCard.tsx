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
      {/* No card chrome. A bordered, shadowed box makes a grid read as a
          dashboard; letting the image sit on the page and carrying the
          hierarchy in the type is what makes a shop look considered. */}
      <div className="relative aspect-[4/5] overflow-hidden rounded-brand bg-surface-alt">
        <ProductImage
          src={product.imageUrl}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover motion-safe:transition-transform motion-safe:duration-[600ms] motion-safe:ease-out motion-safe:group-hover:scale-[1.04]"
          fallback={
            <div className="absolute inset-0 flex items-center justify-center text-fg-subtle/40">
              <ShoppingCart size={40} strokeWidth={1} />
            </div>
          }
        />

        {!sellable && (
          <>
            <span aria-hidden className="absolute inset-0 bg-bg/50" />
            <span className="absolute left-3 top-3 bg-fg px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-bg">
              Sold out
            </span>
          </>
        )}

        <button
          onClick={handleToggleWishlist}
          aria-label={isWishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
          className={clsx(
            'absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full backdrop-blur transition',
            isWishlisted
              ? 'bg-rose-500/90 text-white'
              : 'bg-bg/50 text-fg opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
          )}
        >
          <Heart size={14} className={isWishlisted ? 'fill-white' : ''} />
        </button>

        {/* The buy action rises out of the image on hover, so the grid stays
            quiet until someone is actually interested in one of them. */}
        {sellable && !product.hasVariants && (
          <button
            onClick={handleAddToCart}
            className="absolute inset-x-2 bottom-2 hidden h-10 items-center justify-center gap-2 rounded-brand bg-fg text-xs font-semibold uppercase tracking-[0.12em] text-bg opacity-0 motion-safe:transition-all motion-safe:duration-300 group-hover:translate-y-0 group-hover:opacity-100 focus-visible:opacity-100 sm:flex motion-safe:translate-y-2"
          >
            <ShoppingCart size={14} />
            Add to cart
          </button>
        )}
      </div>

      <div className="pt-4">
        {product.categoryName && (
          <p className="eyebrow text-[10px] tracking-[0.16em]">{product.categoryName}</p>
        )}
        <h3 className="mt-1.5 line-clamp-1 text-sm font-medium text-fg transition-colors group-hover:text-primary">
          {product.name}
        </h3>
        <p className="price mt-1 text-sm text-fg-muted">
          {product.hasVariants && <span className="mr-1 text-xs">From</span>}
          {money(product.price ?? 0)}
        </p>

        {/* Phones never get a hover, so variants and small screens get a plain
            line of text instead of an action they cannot reach. */}
        {sellable && !product.hasVariants && (
          <button
            onClick={handleAddToCart}
            className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-primary sm:hidden"
          >
            Add to cart
          </button>
        )}
      </div>
    </Link>
  );
}
