import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { loadStore } from '@/lib/sdk/store';
import { getXebokiClient } from '@/lib/sdk/client';
import { AccountDashboard } from '@/components/account/AccountDashboard';

interface Props {
  params: { store: string };
}

export default async function AccountPage({ params }: Props) {
  const session = await getSession();
  if (!session || session.storeSlug !== params.store) {
    redirect(`/${params.store}/login`);
  }

  const resolved = await loadStore(params.store);
  if (!resolved) redirect(`/${params.store}`);

  const client = getXebokiClient(resolved.apiKey);
  const ordersResult = await client.ordering
    .listOrders({ customerId: session.customerId, limit: 20 })
    .catch(() => ({ data: [], total: 0, limit: 20, offset: 0 }));

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">My Account</h1>
      <AccountDashboard
        session={session}
        storeSlug={params.store}
        initialOrders={ordersResult.data}
      />
    </div>
  );
}
