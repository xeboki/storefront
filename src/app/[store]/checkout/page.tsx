/**
 * Checkout page. Loads the store (shipping rules) and, for a signed-in
 * customer, their loyalty balance + conversion so the checkout can offer a
 * points redemption. CheckoutView is a client component (Stripe.js).
 */
import { notFound } from 'next/navigation';
import { loadStore } from '@/lib/sdk/store';
import { getXebokiClient } from '@/lib/sdk/client';
import { getSession } from '@/lib/auth/session';
import { CheckoutView } from '@/components/checkout/CheckoutView';

interface Props {
  params: { store: string };
}

export default async function CheckoutPage({ params }: Props) {
  const resolved = await loadStore(params.store);
  if (!resolved) notFound();

  // Loyalty offer — only for a signed-in customer with points to spend.
  let loyalty: { points: number; redemptionThreshold: number; redemptionValue: number } | null = null;
  const session = await getSession();
  if (session?.customerId && session.storeSlug === params.store) {
    try {
      const client = getXebokiClient(resolved.apiKey);
      const [customer, config] = await Promise.all([
        client.ordering.getCustomer(session.customerId),
        client.ordering.getLoyaltyConfig(),
      ]);
      const points = customer?.loyaltyPoints ?? 0;
      if (points > 0 && config.redemptionThreshold > 0 && config.redemptionValue > 0) {
        loyalty = {
          points,
          redemptionThreshold: config.redemptionThreshold,
          redemptionValue: config.redemptionValue,
        };
      }
    } catch {
      loyalty = null; // loyalty is a bonus at checkout, never a blocker
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Checkout</h1>
      <CheckoutView
        storeSlug={params.store}
        storefrontConfig={resolved.storefrontConfig}
        loyalty={loyalty}
      />
    </div>
  );
}
