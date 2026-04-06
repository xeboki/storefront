import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { loadStore } from '@/lib/sdk/store';
import { getXebokiClient } from '@/lib/sdk/client';
import { AddressBook } from '@/components/account/AddressBook';

interface Props {
  params: { store: string };
}

export default async function AddressesPage({ params }: Props) {
  const session = await getSession();
  if (!session || session.storeSlug !== params.store) {
    redirect(`/${params.store}/login`);
  }

  const resolved = await loadStore(params.store);
  if (!resolved) redirect(`/${params.store}`);

  const client = getXebokiClient(resolved.apiKey);
  const addresses = await client.ordering
    .listCustomerAddresses(session.customerId)
    .catch(() => []);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">My Addresses</h1>
      <AddressBook
        initialAddresses={addresses}
        customerId={session.customerId}
        storeSlug={params.store}
      />
    </div>
  );
}
