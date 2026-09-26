/**
 * One store's own page.
 *
 * A real URL per branch, so it can be linked, ranked, and carry that branch's
 * own address and delivery area — none of which a `?loc=<uuid>` can do.
 */
import type { Metadata } from 'next';
import { storeName } from '@/lib/store-name';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Clock, Mail, MapPin, Navigation, Phone, Store, Truck } from 'lucide-react';
import { loadStore, loadLocations } from '@/lib/sdk/store';
import { activeLocation, locationBySlug, serviceArea, storeLabel } from '@/lib/location';
import { generateBreadcrumbs, generateLocalBranch } from '@/lib/seo/structured-data';
import { OpeningHoursTable } from '@/components/location/OpeningHours';
import { formatCurrency } from '@/lib/utils';

interface Props {
  params: { store: string; slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolved = await loadStore(params.store);
  if (!resolved) return {};
  const branch = locationBySlug(resolved.storefrontConfig, params.slug);
  if (!branch) return {};

  const name = storeLabel(branch);
  const where = branch.pickupAddress || branch.city;
  return {
    title: name,
    description: where
      ? `${storeName(resolved.storeConfig)} in ${where}. Shop this store, check click & collect and see the areas it delivers to.`
      : `Shop ${storeName(resolved.storeConfig)} at ${name}.`,
  };
}

/** A maps link anyone's phone will open, from whatever address we hold. */
function directionsHref(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export default async function LocationPage({ params }: Props) {
  const resolved = await loadStore(params.store);
  if (!resolved) notFound();

  const { storeConfig, storefrontConfig } = resolved;
  const branch = locationBySlug(storefrontConfig, params.slug);
  if (!branch) notFound();

  const name = storeLabel(branch);

  // The ordering terms live on the storefront config; the branch's own address,
  // phone and trading hours live on the location record. Join them by id rather
  // than keep a second copy of the address in the CMS.
  const record = (await loadLocations(resolved.apiKey).catch(() => []))
    .find((l) => l.id === branch.locationId) ?? null;

  const address =
    branch.pickupAddress ||
    (typeof record?.address === 'string' ? record.address : '') ||
    branch.city ||
    '';
  const phone = record?.phone || storeConfig.supportPhone || '';
  const email = record?.email || storeConfig.supportEmail || '';
  const hours = record?.hours ?? null;

  // Someone can land here from a search result while their basket and the
  // header both belong to another branch. Say which is which rather than let
  // the page and the header contradict each other in silence.
  const shoppingAt = activeLocation(storefrontConfig);
  const browsingElsewhere =
    shoppingAt !== null && shoppingAt.locationId !== branch.locationId;
  const areas = serviceArea(branch);
  const currency = storeConfig.currencyCode;

  const jsonLd = generateLocalBranch(params.store, storefrontConfig, storeConfig, {
    slug: params.slug,
    name,
    city: branch.city ?? '',
    address: branch.pickupAddress ?? '',
    serviceArea: areas,
    phone,
    hours,
  });
  const breadcrumbJsonLd = generateBreadcrumbs(params.store, storefrontConfig, [
    { name: 'Our stores', path: '/locations' },
    { name, path: `/l/${params.slug}` },
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <Link href={`/${params.store}/locations`} className="text-sm text-fg-muted hover:text-primary">
        ← All stores
      </Link>

      <h1 className="mt-3 text-2xl font-bold text-fg">{name}</h1>
      {address && (
        <p className="mt-1 flex items-start gap-1.5 text-fg-muted">
          <MapPin size={16} className="mt-1 flex-shrink-0" aria-hidden />
          {address}
        </p>
      )}

      {/* Shopping this store is the whole point of the page, so it comes first
          and it sets the chosen store on the way through. */}
      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          href={`/${params.store}/catalog?loc=${branch.locationId}`}
          className="rounded-brand bg-primary-solid px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          Shop this store
        </Link>
        {address && (
          <a
            href={directionsHref(address)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-brand border border-line px-4 py-2.5 text-sm font-medium text-fg transition-colors hover:border-primary hover:text-primary"
          >
            <Navigation size={15} aria-hidden /> Directions
          </a>
        )}
        {/* tel: and mailto: are the mobile-contact path — one tap, no form. */}
        {phone && (
          <a
            href={`tel:${phone.replace(/\s+/g, '')}`}
            className="flex items-center gap-1.5 rounded-brand border border-line px-4 py-2.5 text-sm font-medium text-fg transition-colors hover:border-primary hover:text-primary"
          >
            <Phone size={15} aria-hidden /> Call
          </a>
        )}
        {email && (
          <a
            href={`mailto:${email}`}
            className="flex items-center gap-1.5 rounded-brand border border-line px-4 py-2.5 text-sm font-medium text-fg transition-colors hover:border-primary hover:text-primary"
          >
            <Mail size={15} aria-hidden /> Email
          </a>
        )}
      </div>

      {browsingElsewhere && (
        <p className="mt-3 text-sm text-fg-muted">
          You are currently shopping at{' '}
          <strong className="text-fg">{storeLabel(shoppingAt)}</strong>. “Shop this
          store” switches you to {name}.
        </p>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <section className="rounded-brand border border-line bg-surface p-5">
          <h2 className="flex items-center gap-2 font-semibold text-fg">
            <Store size={16} aria-hidden /> Click &amp; collect
          </h2>
          {branch.pickupEnabled ? (
            <>
              <p className="mt-2 text-sm text-fg-muted">Available at this store.</p>
              {branch.pickupInstructions && (
                <p className="mt-2 text-sm text-fg-subtle">{branch.pickupInstructions}</p>
              )}
            </>
          ) : (
            <p className="mt-2 text-sm text-fg-muted">Not offered at this store.</p>
          )}
        </section>

        <section className="rounded-brand border border-line bg-surface p-5">
          <h2 className="flex items-center gap-2 font-semibold text-fg">
            <Truck size={16} aria-hidden /> Delivery
          </h2>
          {branch.deliveryEnabled ? (
            <dl className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-fg-muted">Delivery fee</dt>
                <dd className="text-fg">
                  {branch.deliveryFee > 0 ? formatCurrency(branch.deliveryFee, currency) : 'Free'}
                </dd>
              </div>
              {branch.freeShippingThreshold != null && (
                <div className="flex justify-between gap-4">
                  <dt className="text-fg-muted">Free over</dt>
                  <dd className="text-fg">{formatCurrency(branch.freeShippingThreshold, currency)}</dd>
                </div>
              )}
              {branch.minOrder > 0 && (
                <div className="flex justify-between gap-4">
                  <dt className="text-fg-muted">Minimum order</dt>
                  <dd className="text-fg">{formatCurrency(branch.minOrder, currency)}</dd>
                </div>
              )}
              <div className="flex justify-between gap-4">
                <dt className="text-fg-muted">Estimated</dt>
                <dd className="text-fg">
                  {branch.minDays}–{branch.maxDays} days
                </dd>
              </div>
            </dl>
          ) : (
            <p className="mt-2 text-sm text-fg-muted">Not offered from this store.</p>
          )}
        </section>
      </div>

      {hours && (
        <section className="mt-4 rounded-brand border border-line bg-surface p-5">
          <h2 className="flex items-center gap-2 font-semibold text-fg">
            <Clock size={16} aria-hidden /> Opening hours
          </h2>
          <OpeningHoursTable hours={hours} />
        </section>
      )}

      {/* The coverage zone, spelled out. A shopper should not have to reach
          checkout to discover whether this store reaches them. */}
      {branch.deliveryEnabled && areas.length > 0 && (
        <section className="mt-4 rounded-brand border border-line bg-surface p-5">
          <h2 className="font-semibold text-fg">Areas this store delivers to</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {areas.map((city) => (
              <li
                key={city}
                className="rounded-full border border-line px-3 py-1 text-sm text-fg-muted"
              >
                {city}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
