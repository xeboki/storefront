import { notFound } from 'next/navigation';
import { loadStore } from '@/lib/sdk/store';
import { ClassList } from '@/components/booking/ClassList';
import type { Metadata } from 'next';
import { hasClasses } from '@/lib/business-type';

interface Props {
  params: { store: string };
}

export const metadata: Metadata = { title: 'Classes' };

// The same business types that can take appointments can run classes — a class
// is a service with a room and a capacity. Whether one has any is answered by
// the timetable being empty, not by hiding the page.

export default async function ClassesPage({ params }: Props) {
  const resolved = await loadStore(params.store);
  if (!resolved) notFound();

  if (!hasClasses(resolved.storeConfig.businessType)) notFound();

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-fg">Classes</h1>
        <p className="text-fg-muted mt-1 text-sm">
          Book your place in an upcoming class.
        </p>
      </div>

      <ClassList storeSlug={params.store} />
    </div>
  );
}
