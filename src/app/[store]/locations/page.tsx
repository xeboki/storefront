/**
 * Store finder.
 *
 * The shop's branches each had a `?loc=<uuid>` and nothing else — no page to
 * link to, rank, or hand someone. This is the index those pages hang off.
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { loadStore } from '@/lib/sdk/store';
import { locationSlugs, serviceArea } from '@/lib/location';
import { LocationFinder, type LocationRow } from '@/components/location/LocationFinder';
import { generateBreadcrumbs } from '@/lib/seo/structured-data';

interface Props {
  params: { store: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolved = await loadStore(params.store);
  if (!resolved) return {};
  const count = locationSlugs(resolved.storefrontConfig).size;
  return {
    title: 'Our stores',
    description: count
      ? `Find your nearest ${resolved.storeConfig.businessName} store — ${count} ${count === 1 ? 'location' : 'locations'}, with opening details, delivery areas and click & collect.`
      : `${resolved.storeConfig.businessName} store locations.`,
  };
}

export default async function LocationsPage({ params }: Props) {
  const resolved = await loadStore(params.store);
  if (!resolved) notFound();

  const { storefrontConfig, storeConfig } = resolved;
  const rows: LocationRow[] = [...locationSlugs(storefrontConfig)].map(([slug, s]) => ({
    slug,
    locationId: s.locationId,
    name: s.locationName || s.city || 'Store',
    city: s.city ?? '',
    serviceArea: serviceArea(s),
    address: s.pickupAddress ?? '',
    delivery: s.deliveryEnabled,
    pickup: s.pickupEnabled,
  }));

  // A shop with no branches configured online has no finder to show. Say so,
  // rather than render an empty page that reads as broken.
  if (rows.length === 0) notFound();

  const breadcrumbJsonLd = generateBreadcrumbs(params.store, storefrontConfig, [
    { name: 'Our stores', path: '/locations' },
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <h1 className="text-2xl font-bold text-fg">Our stores</h1>
      <p className="mb-6 mt-1 text-sm text-fg-muted">
        {rows.length} {rows.length === 1 ? 'location' : 'locations'} ·{' '}
        {storeConfig.businessName}
      </p>
      <LocationFinder storeSlug={params.store} rows={rows} />
    </div>
  );
}
