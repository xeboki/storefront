import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getSession } from '@/lib/auth/session';
import { loadStore } from '@/lib/sdk/store';
import { getXebokiClient } from '@/lib/sdk/client';
import { OrdersListClient } from '@/components/account/OrdersListClient';
import type { Metadata } from 'next';

interface Props {
  params: { store: string };
  searchParams: { status?: string };
}

export const metadata: Metadata = { title: 'My Orders' };

export default async function AccountOrdersPage({ params, searchParams }: Props) {
  const session = await getSession();
  if (!session || session.storeSlug !== params.store) {
    redirect(`/${params.store}/login?next=/${params.store}/account/orders`);
  }

  const resolved = await loadStore(params.store);
  if (!resolved) notFound();

  const client = getXebokiClient(resolved.apiKey);
  const result = await client.ordering.listOrders({
    customerId: session.customerId,
    status: searchParams.status,
    limit: 20,
    offset: 0,
  });

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/${params.store}/account`}
          className="text-slate-400 hover:text-primary transition-colors"
          aria-label="Back to account"
        >
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">My Orders</h1>
      </div>

      <OrdersListClient
        initialOrders={result.data}
        total={result.total}
        storeSlug={params.store}
        initialStatus={searchParams.status}
      />
    </div>
  );
}
