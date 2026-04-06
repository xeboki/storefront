'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Heart, ShoppingCart, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useWishlistStore } from '@/stores/wishlistStore';
import { useCartStore } from '@/stores/cartStore';
import { formatCurrency } from '@/lib/utils';

interface Props {
  storeSlug: string;
}

export function WishlistClient({ storeSlug }: Props) {
  const items = useWishlistStore((s) => s.items.filter((i) => i.storeSlug === storeSlug));
  const removeItem = useWishlistStore((s) => s.removeItem);
  const addToCart = useCartStore((s) => s.addItem);

  function moveToCart(item: typeof items[number]) {
    addToCart({
      productId: item.productId,
      variantId: item.variantId,
      name: item.name,
      price: item.price,
      quantity: 1,
      imageUrl: item.imageUrl,
      modifiers: [],
      modifierLabels: [],
    });
    removeItem(item.productId, storeSlug, item.variantId);
    toast.success(`${item.name} moved to cart`);
  }

  if (items.length === 0) {
    return (
      <div className="py-20 flex flex-col items-center gap-3 text-slate-400">
        <Heart size={48} className="opacity-30" />
        <p className="text-sm">Your wishlist is empty.</p>
        <Link
          href={`/${storeSlug}/catalog`}
          className="text-sm text-primary hover:underline"
        >
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-400">{items.length} saved item{items.length !== 1 ? 's' : ''}</p>
      <ul className="divide-y divide-slate-100 border border-slate-200 rounded-brand overflow-hidden">
        {items.map((item) => (
          <li key={`${item.productId}::${item.variantId ?? ''}`} className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors">
            {/* Image */}
            <Link href={`/${storeSlug}/product/${item.productId}`} className="flex-shrink-0">
              <div className="w-16 h-16 rounded-brand overflow-hidden bg-slate-100">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    width={64}
                    height={64}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <ShoppingCart size={20} />
                  </div>
                )}
              </div>
            </Link>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <Link
                href={`/${storeSlug}/product/${item.productId}`}
                className="font-semibold text-slate-900 text-sm hover:text-primary transition-colors line-clamp-1"
              >
                {item.name}
              </Link>
              {item.variantId && (
                <p className="text-xs text-slate-400 mt-0.5">Variant saved</p>
              )}
              <p className="font-bold text-primary text-sm mt-1">{formatCurrency(item.price)}</p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => moveToCart(item)}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-primary border border-slate-200 hover:border-primary px-3 py-1.5 rounded-brand transition-colors"
              >
                <ShoppingCart size={13} />
                Add to Cart
              </button>
              <button
                onClick={() => removeItem(item.productId, storeSlug, item.variantId)}
                className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                aria-label="Remove from wishlist"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
