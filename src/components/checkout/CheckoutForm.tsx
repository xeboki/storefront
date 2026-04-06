'use client';

import { useState } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { toast } from 'react-hot-toast';
import { useCartStore } from '@/stores/cartStore';
import { formatCurrency } from '@/lib/utils';
import { clsx } from 'clsx';

interface Props {
  storeSlug: string;
  orderId: string;
}

export function CheckoutForm({ storeSlug, orderId }: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.subtotal());
  const clearCart = useCartStore((s) => s.clearCart);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);

    // Confirm payment with Stripe — redirect: 'if_required' avoids full page nav
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
      confirmParams: {
        return_url: `${window.location.origin}/${storeSlug}/orders/${orderId}`,
      },
    });

    if (error) {
      toast.error(error.message ?? 'Payment failed');
      setLoading(false);
      return;
    }

    if (!paymentIntent || paymentIntent.status !== 'succeeded') {
      toast.error('Payment was not completed');
      setLoading(false);
      return;
    }

    // Tell Xeboki the payment succeeded
    const confirmRes = await fetch('/api/checkout/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storeSlug,
        orderId,
        paymentIntentId: paymentIntent.id,
      }),
    });

    if (!confirmRes.ok) {
      // Payment captured but confirmation failed
      toast.error('Payment received — please contact support to confirm your order.');
      setLoading(false);
      return;
    }

    clearCart();
    toast.success('Order placed!');
    window.location.href = `/${storeSlug}/orders/${orderId}`;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
      {/* Left: Stripe payment element */}
      <form onSubmit={handleSubmit} className="lg:col-span-3 space-y-6">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Payment</label>
          <div className="p-4 border border-slate-200 rounded-brand">
            <PaymentElement />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !stripe}
          className={clsx(
            'w-full py-3 px-6 rounded-brand font-semibold text-primary-foreground transition-opacity',
            loading || !stripe
              ? 'bg-slate-300 cursor-not-allowed'
              : 'bg-primary hover:opacity-90',
          )}
        >
          {loading ? 'Processing…' : `Pay ${formatCurrency(subtotal)}`}
        </button>
      </form>

      {/* Right: order summary */}
      <div className="lg:col-span-2">
        <div className="rounded-brand border border-slate-200 p-5 space-y-4 sticky top-24">
          <h2 className="font-bold text-slate-900">Order Summary</h2>
          <ul className="divide-y divide-slate-100 text-sm">
            {items.map((item) => (
              <li
                key={`${item.productId}::${item.variantId ?? ''}`}
                className="flex justify-between gap-2 py-2"
              >
                <span className="text-slate-700 flex-1 min-w-0">
                  {item.name}
                  {item.variantLabel && (
                    <span className="text-slate-400"> ({item.variantLabel})</span>
                  )}
                  <span className="text-slate-400"> × {item.quantity}</span>
                </span>
                <span className="font-medium text-slate-900 whitespace-nowrap">
                  {formatCurrency(item.price * item.quantity)}
                </span>
              </li>
            ))}
          </ul>
          <div className="border-t border-slate-100 pt-3 flex justify-between font-bold text-slate-900">
            <span>Total</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
