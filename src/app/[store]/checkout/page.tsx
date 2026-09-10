/**
 * Checkout page. Loads the store so the checkout knows the shipping rules
 * (and other storefront config) it must apply; CheckoutView itself is a client
 * component because Stripe.js requires the browser.
 */
import { notFound } from 'next/navigation';
import { loadStore } from '@/lib/sdk/store';
import { CheckoutView } from '@/components/checkout/CheckoutView';

interface Props {
  params: { store: string };
}

export default async function CheckoutPage({ params }: Props) {
  const resolved = await loadStore(params.store);
  if (!resolved) notFound();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Checkout</h1>
      <CheckoutView storeSlug={params.store} storefrontConfig={resolved.storefrontConfig} />
    </div>
  );
}
