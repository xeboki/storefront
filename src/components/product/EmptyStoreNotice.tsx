import Link from 'next/link';
import { PackageX } from 'lucide-react';
import type { FulfillmentLocation } from '@xeboki/sdk';

interface Props {
  storeName: string;
  /** The other branches a shopper could switch to. */
  others: FulfillmentLocation[];
  base: string;
}

/**
 * Shown when a location-first shopper lands on a branch with nothing sellable.
 *
 * The alternative is a bare "0 products" under a store name, which reads as a
 * broken shop rather than an empty shelf — and gives no way out.
 */
export function EmptyStoreNotice({ storeName, others, base }: Props) {
  return (
    <div className="rounded-brand border border-line bg-surface px-6 py-12 text-center">
      <PackageX className="mx-auto h-10 w-10 text-fg-subtle" aria-hidden />
      <h2 className="mt-4 text-lg font-semibold text-fg">
        Nothing in stock at {storeName}
      </h2>
      <p className="mt-2 text-sm text-fg-muted">
        This store has no products available to order right now.
      </p>
      {others.length > 0 && (
        <div className="mt-6">
          <p className="text-sm text-fg-muted mb-3">Try another store:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {others.map((s) => (
              <Link
                key={s.locationId}
                href={`${base}?loc=${s.locationId}`}
                className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-fg transition-colors hover:border-primary hover:text-primary"
              >
                {s.locationName || s.city || 'Store'}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
