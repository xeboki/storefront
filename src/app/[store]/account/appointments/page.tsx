import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getSession } from '@/lib/auth/session';
import { loadStore } from '@/lib/sdk/store';
import { getXebokiClient } from '@/lib/sdk/client';
import { AppointmentsListClient } from '@/components/account/AppointmentsListClient';
import type { Metadata } from 'next';

interface Props {
  params: { store: string };
}

export const metadata: Metadata = { title: 'My Appointments' };

export default async function AccountAppointmentsPage({ params }: Props) {
  const session = await getSession();
  if (!session || session.storeSlug !== params.store) {
    redirect(`/${params.store}/login?next=/${params.store}/account/appointments`);
  }

  const resolved = await loadStore(params.store);
  if (!resolved) notFound();

  const client = getXebokiClient(resolved.apiKey);
  const result = await client.ordering.listAppointments({
    customerId: session.customerId,
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
        <h1 className="text-2xl font-bold text-slate-900">My Appointments</h1>
      </div>

      <div className="mb-4">
        <Link
          href={`/${params.store}/book`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-brand hover:opacity-90 transition-opacity"
        >
          + Book New Appointment
        </Link>
      </div>

      <AppointmentsListClient
        initialAppointments={result.data}
        storeSlug={params.store}
      />
    </div>
  );
}
