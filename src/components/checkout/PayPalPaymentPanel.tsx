'use client';

import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { toast } from 'react-hot-toast';
import { useCartStore } from '@/stores/cartStore';

interface Props {
  storeSlug: string;
  clientId: string;
  paypalOrderId: string;
  xebokiOrderId: string;
  currency: string;
}

export function PayPalPaymentPanel({
  storeSlug,
  clientId,
  paypalOrderId,
  xebokiOrderId,
  currency,
}: Props) {
  const clearCart = useCartStore((s) => s.clearCart);

  return (
    <PayPalScriptProvider
      options={{
        clientId,
        currency: currency.toUpperCase(),
        intent: 'capture',
      }}
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-500">
          You will be redirected to PayPal to complete your payment securely.
        </p>

        <PayPalButtons
          style={{ layout: 'vertical', shape: 'rect', label: 'pay' }}
          // Return the pre-created PayPal order ID — no new order is created here
          createOrder={() => Promise.resolve(paypalOrderId)}
          onApprove={async () => {
            const res = await fetch('/api/checkout/paypal/capture', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ storeSlug, paypalOrderId, xebokiOrderId }),
            });

            if (!res.ok) {
              const { error } = await res.json();
              toast.error(error ?? 'Payment capture failed. Please contact support.');
              return;
            }

            clearCart();
            toast.success('Order placed!');
            window.location.href = `/${storeSlug}/orders/${xebokiOrderId}`;
          }}
          onError={() => {
            toast.error('PayPal encountered an error. Please try again.');
          }}
          onCancel={() => {
            toast('Payment cancelled.');
          }}
        />
      </div>
    </PayPalScriptProvider>
  );
}
