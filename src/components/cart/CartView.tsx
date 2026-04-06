'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { useCartStore } from '@/stores/cartStore';
import { formatCurrency } from '@/lib/utils';

interface Props {
  storeSlug: string;
}

export function CartView({ storeSlug }: Props) {
  const { items, updateQuantity, removeItem, subtotal } = useCartStore();

  if (items.length === 0) {
    return (
      <div className="text-center py-20 text-slate-400">
        <ShoppingBag size={56} className="mx-auto mb-4 opacity-40" />
        <p className="text-lg font-medium text-slate-600">Your cart is empty</p>
        <Link
          href={`/${storeSlug}/catalog`}
          className="mt-4 inline-block text-primary font-medium hover:underline"
        >
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Line items */}
      <ul className="divide-y divide-slate-100">
        {items.map((item) => (
          <li
            key={`${item.productId}::${item.variantId ?? ''}`}
            className="flex gap-4 py-4"
          >
            {/* Thumbnail */}
            <div className="w-20 h-20 rounded-brand overflow-hidden bg-slate-100 flex-shrink-0">
              {item.imageUrl ? (
                <Image
                  src={item.imageUrl}
                  alt={item.name}
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300">
                  <ShoppingBag size={28} />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-slate-900">{item.name}</h3>
              {item.variantLabel && (
                <p className="text-xs text-slate-500 mt-0.5">{item.variantLabel}</p>
              )}
              {item.modifierLabels.length > 0 && (
                <p className="text-xs text-slate-400 mt-0.5">
                  {item.modifierLabels.join(', ')}
                </p>
              )}
              <p className="text-sm font-bold text-slate-900 mt-1">
                {formatCurrency(item.price)}
              </p>
            </div>

            <div className="flex flex-col items-end gap-2">
              {/* Quantity controls */}
              <div className="flex items-center border border-slate-200 rounded-brand overflow-hidden">
                <button
                  onClick={() => updateQuantity(item.productId, item.variantId, item.quantity - 1)}
                  className="px-2 py-1 text-slate-500 hover:bg-slate-50"
                >
                  <Minus size={14} />
                </button>
                <span className="px-2 text-sm font-medium text-slate-900">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.productId, item.variantId, item.quantity + 1)}
                  className="px-2 py-1 text-slate-500 hover:bg-slate-50"
                >
                  <Plus size={14} />
                </button>
              </div>

              <button
                onClick={() => removeItem(item.productId, item.variantId)}
                className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                aria-label="Remove"
              >
                <Trash2 size={16} />
              </button>

              <p className="text-sm font-bold text-slate-900">
                {formatCurrency(item.price * item.quantity)}
              </p>
            </div>
          </li>
        ))}
      </ul>

      {/* Summary */}
      <div className="rounded-brand border border-slate-200 p-5 space-y-3">
        <div className="flex justify-between text-slate-600">
          <span>Subtotal</span>
          <span className="font-medium">{formatCurrency(subtotal())}</span>
        </div>
        <div className="flex justify-between text-slate-400 text-sm">
          <span>Shipping & tax</span>
          <span>Calculated at checkout</span>
        </div>
        <div className="border-t border-slate-100 pt-3 flex justify-between font-bold text-slate-900 text-lg">
          <span>Total</span>
          <span>{formatCurrency(subtotal())}</span>
        </div>

        <Link
          href={`/${storeSlug}/checkout`}
          className="block w-full text-center py-3 px-6 bg-primary text-primary-foreground font-semibold rounded-brand hover:opacity-90 transition-opacity"
        >
          Proceed to Checkout
        </Link>

        <Link
          href={`/${storeSlug}/catalog`}
          className="block w-full text-center py-2 text-sm text-slate-500 hover:text-primary transition-colors"
        >
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
