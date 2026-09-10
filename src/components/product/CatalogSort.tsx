'use client';

/**
 * Server-driven sort control. Writes ?sort= to the URL, which re-queries the
 * API so sorting applies across the whole result set, not just the current page.
 */
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

const OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low → High' },
  { value: 'price_desc', label: 'Price: High → Low' },
  { value: 'name_asc', label: 'Name: A → Z' },
  { value: 'name_desc', label: 'Name: Z → A' },
];

export function CatalogSort({ current }: { current: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  return (
    <label className="flex items-center gap-2 text-sm text-slate-600 whitespace-nowrap">
      Sort
      <select
        value={current}
        onChange={(e) => {
          const p = new URLSearchParams(params.toString());
          if (e.target.value) p.set('sort', e.target.value);
          else p.delete('sort');
          p.delete('page');
          router.push(`${pathname}?${p.toString()}`, { scroll: false });
        }}
        className="border border-slate-200 rounded-brand text-sm px-2 py-2 focus:outline-none focus:border-primary"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}
