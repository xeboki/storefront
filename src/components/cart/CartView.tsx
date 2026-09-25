'use client';

import Link from 'next/link';
import { ProductImage } from '@/components/product/ProductImage';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { useCartStore } from '@/stores/cartStore';
import { formatCurrency } from '@/lib/utils';
import { useMoney } from '@/lib/currency';

interface Props {
  storeSlug: string;
}

export function CartView({ storeSlug }: Props) {
  const money = useMoney();
  const { items, updateQuantity, removeItem, subtotal } = useCartStore();

  if (items.length === 0) {
    return (
      <div className="text-center py-20 text-fg-subtle">
        <ShoppingBag size={56} className="mx-auto mb-4 opacity-40" />
        <p className="text-lg font-medium text-fg-muted">Your cart is empty</p>
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
    // Lines left, summary right and sticky. A single stacked column pushed the
    // total and the checkout button below the fold the moment a basket had
    // more than three things in it.
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-16">
      <ul className="divide-y divide-line border-y border-line">
        {items.map((item) => (
          <li
            key={`${item.productId}::${item.variantId ?? ''}`}
            className="flex gap-5 py-6"
          >
            <div className="h-24 w-20 flex-shrink-0 overflow-hidden rounded-brand bg-surface-alt">
              <ProductImage
                src={item.imageUrl}
                alt={item.name}
                width={80}
                height={96}
                className="h-full w-full object-cover"
                fallback={
                  <div className="w-full h-full flex items-center justify-center text-fg-subtle">
                    <ShoppingBag size={28} />
                  </div>
                }
              />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-fg">{item.name}</h3>
              {item.variantLabel && (
                <p className="text-xs text-fg-muted mt-0.5">{item.variantLabel}</p>
              )}
              {item.modifierLabels.length > 0 && (
                <p className="text-xs text-fg-subtle mt-0.5">
                  {item.modifierLabels.join(', ')}
                </p>
              )}
              <p className="price mt-1.5 text-sm text-fg-muted">{money(item.price)}</p>
            </div>

            <div className="flex flex-col items-end gap-2">
              {/* Quantity controls */}
              <div className="flex items-center border border-line rounded-brand overflow-hidden">
                <button
                  onClick={() => updateQuantity(item.productId, item.variantId, item.quantity - 1)}
                  className="px-2 py-1 text-fg-muted hover:bg-surface-alt"
                >
                  <Minus size={14} />
                </button>
                <span className="px-2 text-sm font-medium text-fg">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.productId, item.variantId, item.quantity + 1)}
                  className="px-2 py-1 text-fg-muted hover:bg-surface-alt"
                >
                  <Plus size={14} />
                </button>
              </div>

              <button
                onClick={() => removeItem(item.productId, item.variantId)}
                className="p-1 text-fg-subtle hover:text-rose-500 transition-colors"
                aria-label="Remove"
              >
                <Trash2 size={16} />
              </button>

              <p className="price text-sm font-medium text-fg">
                {money(item.price * item.quantity)}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <div className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-brand-lg border border-line bg-surface-alt/40 p-6">
          <p className="eyebrow text-[10px]">Summary</p>

          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-fg-muted">Subtotal</dt>
              <dd className="price text-fg">{money(subtotal())}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-fg-muted">Shipping &amp; tax</dt>
              <dd className="text-fg-subtle">Calculated at checkout</dd>
            </div>
            <div className="flex justify-between border-t border-line pt-4">
              <dt className="font-medium text-fg">Total</dt>
              <dd className="price text-lg font-medium text-fg">{money(subtotal())}</dd>
            </div>
          </dl>

          <Link
            href={`/${storeSlug}/checkout`}
            className="mt-6 flex h-12 w-full items-center justify-center rounded-brand bg-primary text-xs font-semibold uppercase tracking-[0.14em] text-primary-foreground transition-opacity hover:opacity-90"
          >
            Proceed to Checkout
          </Link>

          <Link
            href={`/${storeSlug}/catalog`}
            className="mt-3 block text-center text-xs font-semibold uppercase tracking-[0.12em] text-fg-muted transition-colors hover:text-primary"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
