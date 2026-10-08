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
import { shopUrl } from '@/lib/request-origin';
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

  // The shop's own address, as the request arrived at it. A share link has
  // to be absolute — a relative one pasted into WhatsApp goes nowhere. One
  // helper answers this for every page that shares something.
  const storeUrl = shopUrl(params.store);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-fg mb-6">Order Details</h1>
      <OrderDetail
        order={order}
        storeSlug={params.store}
        isGuest={!session}
        thankYouMessage={resolved?.storefrontConfig?.checkout?.thankYouMessage}
        showSocialShare={resolved?.storefrontConfig?.checkout?.showSocialShare ?? false}
        /* Resolved HERE, on the server.
           It was built from `window.location.origin`, which is undefined
           during SSR — so the share block rendered as nothing in the served
           HTML and would only have appeared after hydration, if at all. */
        shopUrl={storeUrl}
        shopName={resolved?.storeConfig?.displayName || resolved?.storeConfig?.businessName || ''}
      />
    </div>
  );
}
