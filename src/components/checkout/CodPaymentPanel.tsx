'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useCartStore } from '@/stores/cartStore';
import { formatCurrency } from '@/lib/utils';

interface Props {
  storeSlug: string;
  total: number;
  items: Array<{
    productId: string;
    variantId?: string;
    quantity: number;
    modifiers?: Array<{ modifierId: string }>;
    notes?: string;
  }>;
  customerId?: string;
  guestName?: string;
  guestEmail?: string;
  deliveryType: 'pickup' | 'delivery' | 'dineIn';
  notes?: string;
  /** Which table a dine-in order belongs to. Forwarded to the order. */
  tableId?: string;
  /** Forwarded to /api/checkout/cod and applied to the order server-side. */
  discountCode?: string;
  giftCardCode?: string;
  shippingAmount?: number;
  loyaltyPointsRedeemed?: number;
}

export function CodPaymentPanel({
  storeSlug,
  total,
  items,
  customerId,
  guestName,
  guestEmail,
  deliveryType,
  notes,
  tableId,
  discountCode,
  giftCardCode,
  shippingAmount,
  loyaltyPointsRedeemed,
}: Props) {
  const clearCart = useCartStore((s) => s.clearCart);
  const [loading, setLoading] = useState(false);

  async function placeOrder() {
    setLoading(true);

    const res = await fetch('/api/checkout/cod', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storeSlug,
        items,
        customerId,
        guestName,
        guestEmail,
        deliveryType,
        notes,
        tableId,
        // These arrive as props and the order summary already reflects them,
        // but they were left out of the request — so a COD order was always
        // created at full price and the discount the customer saw vanished.
        discountCode,
        giftCardCode,
        shippingAmount,
        loyaltyPointsRedeemed,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const { error } = await res.json();
      toast.error(error ?? 'Failed to place order');
      return;
    }

    const { orderId } = await res.json();
    clearCart();
    toast.success('Order placed!');
    window.location.href = `/${storeSlug}/orders/${orderId}`;
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="font-semibold mb-1">
          {deliveryType === 'delivery' ? 'Pay on Delivery' : 'Pay at Pickup'}
        </p>
        <p>
          {deliveryType === 'delivery'
            ? 'Your order will be delivered and payment collected at your door.'
            : 'You can pay when you collect your order in store.'}
        </p>
      </div>

      <div className="flex justify-between text-sm font-semibold text-slate-900 border-t border-slate-100 pt-4">
        <span>Amount due</span>
        <span>{formatCurrency(total)}</span>
      </div>

      <button
        onClick={placeOrder}
        disabled={loading}
        className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-brand hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {loading ? 'Placing order…' : 'Place Order'}
      </button>
    </div>
  );
}
