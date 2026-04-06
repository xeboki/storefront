/**
 * Checkout page — Stripe Elements wrapper.
 * Client component because Stripe.js requires browser.
 */
import { CheckoutView } from '@/components/checkout/CheckoutView';

interface Props {
  params: { store: string };
}

export default function CheckoutPage({ params }: Props) {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Checkout</h1>
      <CheckoutView storeSlug={params.store} />
    </div>
  );
}
