/**
 * Order detail page — accessible to both authenticated customers and guests.
 *
 * Guest access: orderId is an unguessable UUID — having it is sufficient to
 * view the order. This matches how post-checkout redirects work for guest checkout.
 *
 * Authenticated access: verified server-side; forbidden if order belongs to
 * a different customer.
 */
import { notFound } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { loadStore } from '@/lib/sdk/store';
import { getXebokiClient } from '@/lib/sdk/client';
import { OrderDetail } from '@/components/account/OrderDetail';

interface Props {
  params: { store: string; orderId: string };
}

export default async function OrderPage({ params }: Props) {
  const resolved = await loadStore(params.store);
  if (!resolved) notFound();

  const client = getXebokiClient(resolved.apiKey);
  const order = await client.ordering.getOrder(params.orderId).catch(() => null);
  if (!order) notFound();

  // If authenticated, make sure this order belongs to the session customer
  const session = await getSession();
  if (session && order.customerId && order.customerId !== session.customerId) {
    notFound();
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Order Details</h1>
      <OrderDetail
        order={order}
        storeSlug={params.store}
        isGuest={!session}
      />
    </div>
  );
}
