'use client';

/**
 * Filter and sort on a phone.
 *
 * The controls used to stack inline — location, category chips, search,
 * in-stock, sort — which filled most of the first screen before a shopper saw
 * a single product. On mobile they collapse into one sticky bar that opens a
 * bottom sheet; the desktop layout is untouched.
 */
import { useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { clsx } from 'clsx';
import { ArrowUpDown, Check, SlidersHorizontal, X } from 'lucide-react';
import type { OrderingCategory } from '@xeboki/sdk';

export const SORT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low → High' },
  { value: 'price_desc', label: 'Price: High → Low' },
  { value: 'name_asc', label: 'Name: A → Z' },
  { value: 'name_desc', label: 'Name: Z → A' },
];

interface Props {
  categories: OrderingCategory[];
  activeCategoryId?: string;
  sort: string;
  inStock: boolean;
  /** True in location-first browsing, where in-stock is not the shopper's to change. */
  lockInStock: boolean;
  total: number;
}

type Panel = 'filter' | 'sort' | null;

export function CatalogFilterSheet({
  categories, activeCategoryId, sort, inStock, lockInStock, total,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [panel, setPanel] = useState<Panel>(null);

  // A sheet over the page must not let the page scroll behind it.
  useEffect(() => {
    if (!panel) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [panel]);

  // Escape closes, as it does for every other overlay.
  useEffect(() => {
    if (!panel) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPanel(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panel]);

  function apply(mutate: (p: URLSearchParams) => void) {
    const p = new URLSearchParams(params.toString());
    mutate(p);
    p.delete('page');
    setPanel(null);
    router.push(`${pathname}?${p.toString()}`, { scroll: false });
  }

  const visibleCategories = categories.filter((c) => c.id !== '_uncategorized');
  // What the shopper has narrowed by — the number on the Filter button.
  const activeCount = (activeCategoryId ? 1 : 0) + (!lockInStock && inStock ? 1 : 0);
  const sortLabel = SORT_OPTIONS.find((o) => o.value === sort)?.label ?? 'Featured';

  const row =
    'flex w-full items-center justify-between gap-3 rounded-brand px-3 py-3 text-left text-sm transition-colors hover:bg-surface-alt';

  return (
    <>
      {/* Tap targets are a full 44px high: this is the primary way to narrow a
          catalog on a phone. */}
      <div className="sm:hidden sticky top-16 z-30 -mx-4 mb-4 flex gap-2 border-b border-line bg-bg/95 px-4 py-2 backdrop-blur">
        <button
          type="button"
          onClick={() => setPanel('filter')}
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-brand border border-line bg-surface text-sm font-medium text-fg"
        >
          <SlidersHorizontal size={16} aria-hidden />
          Filter
          {activeCount > 0 && (
            <span className="ml-0.5 rounded-full bg-primary px-1.5 py-0.5 text-xs font-semibold text-primary-foreground">
              {activeCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setPanel('sort')}
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-brand border border-line bg-surface text-sm font-medium text-fg"
        >
          <ArrowUpDown size={16} aria-hidden />
          <span className="truncate">{sortLabel}</span>
        </button>
      </div>

      {panel && (
        <div className="sm:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <button
            type="button"
            aria-label="Close"
            className="animate-fade absolute inset-0 bg-black/40"
            onClick={() => setPanel(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={panel === 'filter' ? 'Filter products' : 'Sort products'}
            className="animate-sheet relative max-h-[80vh] overflow-y-auto rounded-t-brand-lg border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]"
          >
            <div className="sticky top-0 flex items-center justify-between border-b border-line bg-surface px-4 py-3">
              <h2 className="font-semibold text-fg">
                {panel === 'filter' ? 'Filter' : 'Sort by'}
              </h2>
              <button
                type="button"
                onClick={() => setPanel(null)}
                aria-label="Close"
                className="flex h-9 w-9 items-center justify-center rounded-brand text-fg-muted hover:bg-surface-alt hover:text-fg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-2 py-2">
              {panel === 'sort' &&
                SORT_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => apply((p) => (o.value ? p.set('sort', o.value) : p.delete('sort')))}
                    className={clsx(row, o.value === sort && 'font-semibold text-primary')}
                  >
                    {o.label}
                    {o.value === sort && <Check size={16} aria-hidden />}
                  </button>
                ))}

              {panel === 'filter' && (
                <>
                  {visibleCategories.length > 0 && (
                    <>
                      <p className="px-3 pb-1 pt-2 text-xs font-medium uppercase tracking-wide text-fg-subtle">
                        Category
                      </p>
                      <button
                        type="button"
                        onClick={() => apply((p) => p.delete('category'))}
                        className={clsx(row, !activeCategoryId && 'font-semibold text-primary')}
                      >
                        All products
                        {!activeCategoryId && <Check size={16} aria-hidden />}
                      </button>
                      {visibleCategories.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => apply((p) => p.set('category', cat.id))}
                          className={clsx(row, cat.id === activeCategoryId && 'font-semibold text-primary')}
                        >
                          {cat.name}
                          {cat.id === activeCategoryId && <Check size={16} aria-hidden />}
                        </button>
                      ))}
                    </>
                  )}

                  {/* Hidden in location-first browsing, where the catalog is
                      always what the chosen store can actually sell. */}
                  {!lockInStock && (
                    <>
                      <p className="px-3 pb-1 pt-3 text-xs font-medium uppercase tracking-wide text-fg-subtle">
                        Availability
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          apply((p) => (inStock ? p.delete('instock') : p.set('instock', '1')))
                        }
                        className={clsx(row, inStock && 'font-semibold text-primary')}
                      >
                        In stock only
                        {inStock && <Check size={16} aria-hidden />}
                      </button>
                    </>
                  )}

                  {activeCount > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        apply((p) => {
                          p.delete('category');
                          p.delete('instock');
                        })
                      }
                      className="mt-3 w-full rounded-brand border border-line px-3 py-3 text-sm font-medium text-fg-muted"
                    >
                      Clear filters
                    </button>
                  )}
                </>
              )}
            </div>

            <div className="sticky bottom-0 border-t border-line bg-surface px-4 py-3">
              <button
                type="button"
                onClick={() => setPanel(null)}
                className="w-full rounded-brand bg-primary py-3 text-sm font-semibold text-primary-foreground"
              >
                Show {total} {total === 1 ? 'product' : 'products'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
