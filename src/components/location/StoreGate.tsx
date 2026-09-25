'use client';

/**
 * "Which store are you shopping at?" — asked before anything else.
 *
 * In location-first browsing the branch decides the catalog, the stock, the
 * delivery terms and the price. Defaulting to `onlineStores[0]` meant
 * whichever branch the merchant happened to list first, so a shopper could
 * browse an empty shop without ever learning there was a choice.
 *
 * This blocks: no backdrop dismiss, no escape, no close button. What it does
 * NOT do is gate rendering — the page is server-rendered underneath and this
 * sits over it, so crawlers still index the shop and a shared link still
 * carries its own location past this entirely.
 */
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { MapPin, Store, Truck } from 'lucide-react';
import type { FulfillmentLocation } from '@xeboki/sdk';

interface Props {
  stores: FulfillmentLocation[];
  storeSlug: string;
  businessName: string;
}

function label(s: FulfillmentLocation) {
  return s.locationName || s.city || 'Store';
}

export function StoreGate({ stores, storeSlug, businessName }: Props) {
  const pathname = usePathname();
  const [choosing, setChoosing] = useState<string | null>(null);

  // A branch's own page, and the finder, are ABOUT choosing — demanding a
  // choice on top of them is absurd, and would trap anyone arriving from a
  // search result for that branch.
  const isChoosingPage =
    pathname?.includes('/l/') || pathname?.endsWith('/locations');

  const blocked = stores.length > 1 && !isChoosingPage;

  useEffect(() => {
    if (!blocked) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [blocked]);

  if (!blocked) return null;

  function choose(s: FulfillmentLocation) {
    setChoosing(s.locationId);
    // A full navigation, not a router push: the middleware has to see ?loc to
    // write the cookie, and every price and stock figure already on the page
    // belongs to no store yet.
    const url = new URL(window.location.href);
    url.searchParams.set('loc', s.locationId);
    window.location.href = url.toString();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="store-gate-title"
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
    >
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-brand-lg border border-line bg-surface p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-xl sm:rounded-brand-lg sm:pb-6">
        <span className="flex h-11 w-11 items-center justify-center rounded-brand bg-primary/10 text-primary">
          <MapPin size={22} aria-hidden />
        </span>

        <h2 id="store-gate-title" className="mt-4 text-xl font-bold text-fg">
          Choose your store
        </h2>
        <p className="mt-1.5 text-sm text-fg-muted">
          {businessName} stocks each store separately, so prices and
          availability depend on where you shop.
        </p>

        <ul className="mt-5 space-y-2">
          {stores.map((s) => (
            <li key={s.locationId}>
              <button
                type="button"
                onClick={() => choose(s)}
                disabled={choosing !== null}
                className="flex w-full items-start gap-3 rounded-brand border border-line bg-surface p-4 text-left transition-colors hover:border-primary hover:bg-surface-alt disabled:opacity-60"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-fg">{label(s)}</span>
                  {s.pickupAddress && (
                    <span className="mt-0.5 block text-sm text-fg-muted">
                      {s.pickupAddress}
                    </span>
                  )}
                  <span className="mt-2 flex flex-wrap gap-3 text-xs text-fg-muted">
                    {s.pickupEnabled && (
                      <span className="flex items-center gap-1">
                        <Store size={13} aria-hidden /> Click &amp; collect
                      </span>
                    )}
                    {s.deliveryEnabled && (
                      <span className="flex items-center gap-1">
                        <Truck size={13} aria-hidden /> Delivery
                      </span>
                    )}
                  </span>
                </span>
                {choosing === s.locationId && (
                  <span className="text-xs font-medium text-primary">Opening…</span>
                )}
              </button>
            </li>
          ))}
        </ul>

        {/* Not a dismissal — it leads to the finder, which is another way to
            make the same choice, with search and full opening details. */}
        <a
          href={`/${storeSlug}/locations`}
          className="mt-4 block text-center text-sm font-medium text-primary hover:opacity-80"
        >
          Compare all stores
        </a>
      </div>
    </div>
  );
}
