'use client';

/**
 * Server-driven catalog search box + in-stock toggle.
 *
 * Updates the URL (?q, ?instock) which re-renders the catalog page against the
 * API — so search covers the WHOLE catalog, not just a client-loaded slice.
 * Debounced so typing doesn't fire a request per keystroke; resets to page 1 on
 * any change.
 */
import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';

interface Props {
  initialQuery: string;
  initialInStock: boolean;
  /**
   * True in 'location_first' browsing, where the catalog is always scoped to
   * what the chosen store can sell. Offering the shopper a checkbox that
   * cannot change anything is worse than not offering it.
   */
  lockInStock?: boolean;
}

export function CatalogSearch({ initialQuery, initialInStock, lockInStock = false }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [query, setQuery] = useState(initialQuery);
  const first = useRef(true);

  function pushWith(mutate: (p: URLSearchParams) => void) {
    const p = new URLSearchParams(params.toString());
    mutate(p);
    p.delete('page'); // any filter change returns to page 1
    router.push(`${pathname}?${p.toString()}`, { scroll: false });
  }

  // Debounced query → URL
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => {
      pushWith((p) => {
        const q = query.trim();
        if (q) p.set('q', q);
        else p.delete('q');
      });
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const inStock = params.get('instock') === '1' || (initialInStock && !params.has('instock'));

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-6">
      <div className="relative flex-1">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products…"
          className="w-full pl-9 pr-9 py-2.5 border border-line rounded-brand bg-surface text-fg text-sm placeholder:text-fg-subtle focus:outline-none focus:border-primary"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-subtle hover:text-fg"
          >
            <X size={16} />
          </button>
        )}
      </div>
      {!lockInStock && (
      <label className="hidden sm:flex items-center gap-2 text-sm text-fg-muted whitespace-nowrap px-1">
        <input
          type="checkbox"
          checked={inStock}
          onChange={(e) =>
            pushWith((p) => {
              if (e.target.checked) p.set('instock', '1');
              else p.delete('instock');
            })
          }
        />
        In stock only
      </label>
      )}
    </div>
  );
}
