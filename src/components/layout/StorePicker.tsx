'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, MapPin } from 'lucide-react';
import type { FulfillmentLocation } from '@xeboki/sdk';

interface Props {
  stores: FulfillmentLocation[];
  activeId: string | null;
  /** Set to offer a way through to the full finder. */
  storeSlug?: string;
  className?: string;
}

function label(s: FulfillmentLocation) {
  return s.locationName || s.city || 'Store';
}

/**
 * Which store the shopper is shopping at, in the header where it belongs.
 *
 * It used to be a chip row on the catalog page alone, so from a product page
 * onwards there was nothing on screen saying which branch's shelves these
 * were — and checkout could quietly pick a different one.
 */
export function StorePicker({ stores, activeId, storeSlug, className = '' }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  if (stores.length === 0) return null;

  const active = stores.find((s) => s.locationId === activeId) ?? stores[0];

  // One store on the webshop: there is nothing to switch between, so say where
  // they are shopping without offering a menu that opens onto a single choice.
  if (stores.length === 1) {
    return (
      <span
        className={`flex items-center gap-1.5 whitespace-nowrap px-2 py-1.5 text-sm text-fg-muted ${className}`}
      >
        <MapPin size={16} className="flex-shrink-0" aria-hidden />
        <span className="max-w-[10rem] truncate font-medium">{label(active)}</span>
      </span>
    );
  }

  function choose(s: FulfillmentLocation) {
    setOpen(false);
    if (s.locationId === active.locationId) return;
    // A full navigation, not a client push: the middleware has to see ?loc to
    // write the cookie, and every server-rendered price and stock figure on the
    // page belongs to the old store until it re-renders.
    const url = new URL(window.location.href);
    url.searchParams.set('loc', s.locationId);
    window.location.href = url.toString();
  }

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-brand px-2 py-1.5 text-sm text-fg-muted transition-colors hover:text-primary"
      >
        <MapPin size={16} className="flex-shrink-0" aria-hidden />
        <span className="max-w-[10rem] truncate font-medium">{label(active)}</span>
      </button>

      {open && (
        <>
          {/* Click-away. Covers the page so a tap outside closes the list. */}
          <button
            type="button"
            aria-label="Close store list"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <ul
            role="listbox"
            className="absolute right-0 z-50 mt-1 min-w-[14rem] overflow-hidden rounded-brand border border-line bg-surface py-1 shadow-lg"
          >
            <li className="px-3 pb-1 pt-1.5 text-xs font-medium text-fg-subtle">
              Shopping at
            </li>
            {stores.map((s) => {
              const isActive = s.locationId === active.locationId;
              return (
                <li key={s.locationId}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onClick={() => choose(s)}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm text-fg transition-colors hover:bg-surface-alt"
                  >
                    <span>
                      <span className="block">{label(s)}</span>
                      {s.city && s.city !== label(s) && (
                        <span className="block text-xs text-fg-muted">{s.city}</span>
                      )}
                    </span>
                    {isActive && <Check size={16} className="text-primary" aria-hidden />}
                  </button>
                </li>
              );
            })}
            {storeSlug && stores.length > 1 && (
              <li className="mt-1 border-t border-line">
                <a
                  href={`/${storeSlug}/locations`}
                  className="block px-3 py-2 text-sm font-medium text-primary hover:bg-surface-alt"
                >
                  See all stores
                </a>
              </li>
            )}
          </ul>
        </>
      )}
    </div>
  );
}
