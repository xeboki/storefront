import { notFound } from 'next/navigation';
import { loadStore } from '@/lib/sdk/store';
import { getXebokiClient } from '@/lib/sdk/client';
import { BookingWidget } from '@/components/booking/BookingWidget';
import type { Metadata } from 'next';

interface Props {
  params: { store: string };
}

export const metadata: Metadata = { title: 'Book an Appointment' };

const APPOINTMENT_TYPES = new Set([
  'salon', 'gym', 'service', 'petStore', 'optical', 'mobileRepair',
]);

export default async function BookPage({ params }: Props) {
  const resolved = await loadStore(params.store);
  if (!resolved) notFound();

  const { apiKey, storeConfig } = resolved;

  if (!APPOINTMENT_TYPES.has(storeConfig.businessType)) notFound();

  const client = getXebokiClient(apiKey);

  const [catalogResult, staffResult] = await Promise.allSettled([
    client.ordering.listProducts({ limit: 100 }),
    client.ordering.listStaff({ isActive: true }),
  ]);

  const services = catalogResult.status === 'fulfilled'
    ? catalogResult.value.data.filter((p) => p.isActive)
    : [];

  const staff = staffResult.status === 'fulfilled' ? staffResult.value.data : [];

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Book an Appointment</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Choose your service, preferred staff, and a time that works for you.
        </p>
      </div>

      <div className="rounded-brand border border-slate-200 p-6 bg-surface">
        <BookingWidget
          storeSlug={params.store}
          services={services}
          staff={staff}
        />
      </div>
    </div>
  );
}
