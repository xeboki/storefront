'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { MapPin, Search, Store, Truck } from 'lucide-react';

/** One branch, flattened by the server so this stays a plain client component. */
export interface LocationRow {
  slug: string;
  locationId: string;
  name: string;
  city: string;
  /** Every city this branch delivers to, its own included. */
  serviceArea: string[];
  address: string;
  delivery: boolean;
  pickup: boolean;
}

interface Props {
  storeSlug: string;
  rows: LocationRow[];
}

/** Matches on branch name, its city, or any city it delivers to. */
function matches(row: LocationRow, q: string): boolean {
  if (!q) return true;
  const needle = q.trim().toLowerCase();
  return (
    row.name.toLowerCase().includes(needle) ||
    row.city.toLowerCase().includes(needle) ||
    row.address.toLowerCase().includes(needle) ||
    row.serviceArea.some((c) => c.toLowerCase().includes(needle))
  );
}

export function LocationFinder({ storeSlug, rows }: Props) {
  const [query, setQuery] = useState('');

  const visible = useMemo(() => rows.filter((r) => matches(r, query)), [rows, query]);

  // Grouped by the branch's own city, so a chain with many branches in one city
  // reads as one place rather than a flat list of near-identical names.
  const groups = useMemo(() => {
    const map = new Map<string, LocationRow[]>();
    for (const row of visible) {
      const key = row.city || 'Other';
      const list = map.get(key);
      if (list) list.push(row);
      else map.set(key, [row]);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [visible]);

  return (
    <div>
      {/* A search box earns its place above about six branches; below that the
          list itself is faster to read than anything typed into a field. */}
      {rows.length > 5 && (
        <div className="relative mb-6">
          <Search
            size={16}
            className="absolute start-3 top-1/2 -translate-y-1/2 text-fg-subtle"
            aria-hidden
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by city, area or store name…"
            aria-label="Search stores"
            className="w-full rounded-brand border border-line bg-surface py-2.5 ps-9 pe-3 text-sm text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none"
          />
        </div>
      )}

      {visible.length === 0 ? (
        <p className="rounded-brand border border-line bg-surface px-6 py-10 text-center text-sm text-fg-muted">
          No store matches “{query.trim()}”. Try a city or an area name.
        </p>
      ) : (
        groups.map(([city, list]) => (
          <section key={city} className="mb-8">
            {groups.length > 1 && (
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-fg-muted">
                {city}
              </h2>
            )}
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((row) => (
                <li key={row.locationId}>
                  <Link
                    href={`/${storeSlug}/l/${row.slug}`}
                    className="flex h-full flex-col rounded-brand border border-line bg-surface p-4 transition-colors hover:border-primary"
                  >
                    <span className="font-semibold text-fg">{row.name}</span>
                    {row.address && (
                      <span className="mt-1 flex items-start gap-1.5 text-sm text-fg-muted">
                        <MapPin size={14} className="mt-0.5 flex-shrink-0" aria-hidden />
                        {row.address}
                      </span>
                    )}
                    <span className="mt-3 flex flex-wrap gap-3 text-xs text-fg-muted">
                      {row.pickup && (
                        <span className="flex items-center gap-1">
                          <Store size={13} aria-hidden /> Click &amp; collect
                        </span>
                      )}
                      {row.delivery && (
                        <span className="flex items-center gap-1">
                          <Truck size={13} aria-hidden /> Delivery
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
