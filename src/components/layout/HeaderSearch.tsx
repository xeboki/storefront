'use client';

/**
 * The search field, with the shop's own products under it as you type.
 *
 * The box used to submit and nothing else: finding one product meant typing,
 * pressing enter, waiting for a page and reading a grid. For a shop with a
 * thousand lines that is the difference between finding something and giving
 * up. Now the first few matches appear as you type, each a link straight to
 * the product, with the full results still one enter away.
 *
 * It is a combobox, so it is built like one: `role="combobox"` on the input,
 * `role="listbox"` on the panel, arrow keys move a real `aria-activedescendant`
 * and escape closes without submitting. A suggestion list that only works with
 * a mouse is a worse search box than none.
 */
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Loader2, ArrowRight, Tag } from 'lucide-react';
import { useT } from '@/lib/i18n/client';
import { useMoney } from '@/lib/currency';
import { ProductImage } from '@/components/product/ProductImage';

interface Suggestion {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  categoryName: string | null;
  soldOut: boolean;
}

interface CategoryHit {
  id: string;
  name: string;
}

/** Long enough that a fast typist makes one request, not eight. */
const DEBOUNCE_MS = 180;

export function HeaderSearch({
  storeSlug,
  className = '',
}: {
  storeSlug: string;
  className?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const t = useT();
  const money = useMoney();
  const listId = useId();

  // Seeded from the URL: after searching, the term a shopper typed has to stay
  // visible in the box they typed it into, or the results look unexplained.
  const active = params.get('q') ?? '';
  const [query, setQuery] = useState(active);
  useEffect(() => setQuery(active), [active]);

  const [products, setProducts] = useState<Suggestion[]>([]);
  const [categories, setCategories] = useState<CategoryHit[]>([]);
  const [total, setTotal] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState(-1);

  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  /** Rising number: a slow response for an old term must not overwrite a new one. */
  const latest = useRef(0);

  const term = query.trim();

  useEffect(() => {
    if (term.length < 2) {
      setProducts([]);
      setCategories([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    const mine = ++latest.current;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/suggest?storeSlug=${encodeURIComponent(storeSlug)}&q=${encodeURIComponent(term)}`,
        );
        const data = await res.json();
        if (mine !== latest.current) return;
        setProducts(data.products ?? []);
        setCategories(data.categories ?? []);
        setTotal(data.total ?? 0);
      } catch {
        // A failed suggestion is not an error a shopper needs told about —
        // the box still submits, which is what it did before this existed.
        if (mine === latest.current) {
          setProducts([]);
          setCategories([]);
        }
      } finally {
        if (mine === latest.current) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [term, storeSlug]);

  // Close on a click anywhere else. Focus alone is not enough: a shopper who
  // clicks the page behind the panel expects it gone.
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const rows = useMemo(
    () => [
      ...categories.map((c) => ({ kind: 'category' as const, ...c })),
      ...products.map((p) => ({ kind: 'product' as const, ...p })),
    ],
    [categories, products],
  );

  const hrefFor = useCallback(
    (row: (typeof rows)[number]) =>
      row.kind === 'category'
        ? `/${storeSlug}/catalog?category=${row.id}`
        : `/${storeSlug}/product/${row.id}`,
    [rows, storeSlug],
  );

  function go(url: string) {
    setOpen(false);
    inputRef.current?.blur();
    router.push(url);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    // Enter on a highlighted row opens it; otherwise the full result page.
    if (cursor >= 0 && rows[cursor]) return go(hrefFor(rows[cursor]));
    go(term ? `/${storeSlug}/catalog?q=${encodeURIComponent(term)}` : `/${storeSlug}/catalog`);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      setOpen(false);
      setCursor(-1);
      return;
    }
    if (!rows.length) return;
    if (e.key === 'Enter' && cursor >= 0) {
      // Handled here rather than left to the form: the browser only submits on
      // Enter under conditions that vary, and a highlighted row that does
      // nothing when you press Enter is the whole keyboard path broken.
      e.preventDefault();
      go(hrefFor(rows[cursor]));
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setCursor((c) => (c + 1) % rows.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setOpen(true);
      setCursor((c) => (c <= 0 ? rows.length - 1 : c - 1));
    }
  }

  const showPanel = open && term.length >= 2;

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <form onSubmit={submit} role="search">
        <div className="relative">
          <Search
            size={16}
            aria-hidden
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-fg-subtle"
          />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCursor(-1);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder={t('search.placeholder')}
            aria-label={t('search.placeholder')}
            role="combobox"
            aria-expanded={showPanel}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={cursor >= 0 ? `${listId}-${cursor}` : undefined}
            autoComplete="off"
            className="h-11 w-full rounded-full border border-line bg-surface-alt pl-11 pr-10 text-sm text-fg placeholder:text-fg-subtle focus:border-primary focus:bg-surface focus:outline-none"
          />
          {loading && (
            <Loader2
              size={15}
              aria-hidden
              className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-fg-subtle"
            />
          )}
        </div>
      </form>

      {showPanel && (
        <div
          id={listId}
          role="listbox"
          aria-label={t('search.placeholder')}
          className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-brand border border-line bg-surface shadow-xl"
        >
          {rows.length === 0 && !loading && (
            // Named, not blank: "nothing matched that" is information, an
            // empty panel is a bug.
            <p className="px-4 py-5 text-sm text-fg-muted">
              {t('search.noMatches').replace('{term}', term)}
            </p>
          )}

          {rows.map((row, i) => (
            <Link
              key={`${row.kind}-${row.id}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={cursor === i}
              href={hrefFor(row)}
              onClick={() => setOpen(false)}
              onMouseEnter={() => setCursor(i)}
              className={`flex items-center gap-3 px-3 py-2.5 transition-colors ${
                cursor === i ? 'bg-surface-alt' : ''
              }`}
            >
              {row.kind === 'category' ? (
                <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-brand-sm bg-primary/10 text-primary">
                  <Tag size={16} aria-hidden />
                </span>
              ) : (
                <span className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-brand-sm bg-surface-alt">
                  <ProductImage
                    src={row.imageUrl}
                    alt=""
                    fill
                    sizes="40px"
                    className="object-cover"
                    fallback={<span className="absolute inset-0 bg-surface-alt" />}
                  />
                </span>
              )}

              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-fg">{row.name}</span>
                <span className="block truncate text-xs text-fg-subtle">
                  {row.kind === 'category' ? t('search.inCategory') : row.categoryName ?? ''}
                </span>
              </span>

              {row.kind === 'product' && (
                <span className="flex-shrink-0 text-right">
                  <span
                    className={`price block text-sm ${
                      row.soldOut ? 'text-fg-subtle line-through' : 'text-fg'
                    }`}
                  >
                    {money(row.price)}
                  </span>
                  {row.soldOut && (
                    <span className="block text-[10px] uppercase tracking-wide text-fg-subtle">
                      {t('search.soldOut')}
                    </span>
                  )}
                </span>
              )}
            </Link>
          ))}

          {rows.length > 0 && (
            <button
              type="button"
              onClick={() => go(`/${storeSlug}/catalog?q=${encodeURIComponent(term)}`)}
              className="flex w-full items-center justify-between border-t border-line px-4 py-3 text-sm font-semibold text-primary hover:bg-surface-alt"
            >
              {t('search.seeAll').replace('{count}', String(total))}
              <ArrowRight size={15} aria-hidden />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
