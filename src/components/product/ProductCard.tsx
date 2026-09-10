'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ShoppingCart, Heart } from 'lucide-react';
import { clsx } from 'clsx';
import { toast } from 'react-hot-toast';
import { useCartStore } from '@/stores/cartStore';
import { useWishlistStore } from '@/stores/wishlistStore';
import { formatCurrency } from '@/lib/utils';
import { trackAddToCart } from '@/lib/analytics';
import { useStoreConfigStore } from '@/stores/storeConfigStore';
import type { OrderingProduct } from '@xeboki/sdk';

interface Props {
  product: OrderingProduct;
  storeSlug: string;
}

export function ProductCard({ product, storeSlug }: Props) {
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
      <div className="rounded-brand overflow-hidden border border-slate-200 bg-surface hover:shadow-md transition-shadow">
        <div className="relative aspect-square bg-slate-100">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 768px) 50vw, 25vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-slate-300">
              <ShoppingCart size={48} />
            </div>
          )}

          {!product.isActive && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
              <span className="text-sm font-semibold text-slate-500 bg-white px-3 py-1 rounded-full border">
                Sold Out
              </span>
            </div>
          )}

          {/* Wishlist button */}
          <button
            onClick={handleToggleWishlist}
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
            className={clsx(
              'absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center shadow-sm transition-colors',
              isWishlisted
                ? 'bg-rose-50 text-rose-500'
                : 'bg-white/90 text-slate-400 hover:text-rose-500',
            )}
          >
            <Heart size={14} className={isWishlisted ? 'fill-rose-500' : ''} />
          </button>
        </div>

        <div className="p-3">
          <h3 className="font-medium text-slate-900 line-clamp-2 text-sm">{product.name}</h3>

          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="font-bold text-slate-900">
              {product.hasVariants
                ? `From ${formatCurrency(product.price ?? 0)}`
                : formatCurrency(product.price ?? 0)}
            </span>

            {product.isActive && !product.hasVariants && (
              <button
                onClick={handleAddToCart}
                className="p-1.5 rounded-brand bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
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
