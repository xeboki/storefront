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
  /** Position in its grid, shown as a catalogue index. */
  index?: number;
}

export function ProductCard({ product, storeSlug, index }: Props) {
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
    <Link href={href} className="group relative block">
      {/* The whole card is the image. Title and price sit ON it, revealed on
          approach, so a grid reads as a wall of photographs rather than a
          table of rows with pictures in the first column. */}
      <div className="relative aspect-[4/5] overflow-hidden rounded-brand bg-surface-alt">
        <ProductImage
          src={product.imageUrl}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover motion-safe:transition-transform motion-safe:duration-[900ms] motion-safe:ease-out motion-safe:group-hover:scale-[1.06]"
          fallback={
            <div className="absolute inset-0 flex items-center justify-center text-fg-subtle/40">
              <ShoppingCart size={40} strokeWidth={1} />
            </div>
          }
        />

        {/* A scrim only where the type sits, so the picture stays a picture. */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/85 via-black/45 to-transparent opacity-0 motion-safe:transition-opacity motion-safe:duration-500 group-hover:opacity-100 lg:block"
        />

        {index !== undefined && (
          // A drop shadow rather than mix-blend-difference: blending against
          // arbitrary photography is a gamble, and on the pale shots the
          // number simply disappeared.
          <span
            className="price absolute left-4 top-4 text-[11px] font-medium tracking-[0.2em] text-white"
            style={{ textShadow: '0 1px 6px rgba(0,0,0,0.55)' }}
          >
            {String(index + 1).padStart(2, '0')}
          </span>
        )}

        {!sellable && (
          <>
            <span aria-hidden className="absolute inset-0 bg-bg/55" />
            <span className="absolute left-4 top-4 bg-fg px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-bg">
              Sold out
            </span>
          </>
        )}

        <button
          onClick={handleToggleWishlist}
          aria-label={isWishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
          className={clsx(
            'absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full backdrop-blur transition',
            isWishlisted
              ? 'bg-danger text-white'
              : 'bg-black/25 text-white opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
          )}
        >
          <Heart size={15} className={isWishlisted ? 'fill-white' : ''} />
        </button>

        {/* Desktop: the details ride up out of the bottom edge. */}
        <div className="absolute inset-x-0 bottom-0 hidden p-4 lg:block">
          <div className="motion-safe:translate-y-3 motion-safe:opacity-0 motion-safe:transition-all motion-safe:duration-500 motion-safe:group-hover:translate-y-0 motion-safe:group-hover:opacity-100">
            {product.categoryName && (
              <p className="eyebrow text-[9px] text-white/60">{product.categoryName}</p>
            )}
            <div className="mt-1 flex items-end justify-between gap-3">
              <h3 className="line-clamp-1 text-sm font-medium text-white">{product.name}</h3>
              <span className="price flex-shrink-0 text-sm font-medium text-white">
                {product.hasVariants && <span className="mr-1 text-xs font-normal opacity-70">From</span>}
                {money(product.price ?? 0)}
              </span>
            </div>
            {sellable && !product.hasVariants && (
              <button
                onClick={handleAddToCart}
                className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-brand bg-white text-[11px] font-semibold uppercase tracking-[0.14em] text-black"
              >
                <ShoppingCart size={13} />
                Add to cart
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Phone and tablet: no hover to reveal anything with, so the details
          stay in the flow underneath. */}
      <div className="pt-3 lg:hidden">
        {product.categoryName && (
          <p className="eyebrow text-[9px]">{product.categoryName}</p>
        )}
        <h3 className="mt-1 line-clamp-1 text-sm font-medium text-fg">{product.name}</h3>
        <p className="price mt-0.5 text-sm text-fg-muted">
          {product.hasVariants && <span className="mr-1 text-xs">From</span>}
          {money(product.price ?? 0)}
        </p>
      </div>
    </Link>
  );
}
