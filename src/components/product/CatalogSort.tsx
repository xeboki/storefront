'use client';

/**
 * Server-driven sort control. Writes ?sort= to the URL, which re-queries the
 * API so sorting applies across the whole result set, not just the current page.
 */
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { ChevronDown } from 'lucide-react';

const OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low → High' },
  { value: 'price_desc', label: 'Price: High → Low' },
  { value: 'name_asc', label: 'Name: A → Z' },
  { value: 'name_desc', label: 'Name: Z → A' },
];

export function CatalogSort({ current, className = '' }: { current: string; className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  return (
    // Still a real <select>: it keeps the OS picker on a phone and the
    // keyboard behaviour everywhere. Only the chrome is replaced — appearance
    // stripped and our own chevron drawn — so it stops looking like a form
    // control borrowed from another site.
    <label className={`relative flex items-center gap-2 whitespace-nowrap text-sm text-fg-muted ${className}`}>
      <span className="eyebrow text-[10px]">Sort</span>
      <select
        value={current}
        onChange={(e) => {
          const p = new URLSearchParams(params.toString());
          if (e.target.value) p.set('sort', e.target.value);
          else p.delete('sort');
          p.delete('page');
          router.push(`${pathname}?${p.toString()}`, { scroll: false });
        }}
        className="cursor-pointer appearance-none rounded-brand border border-line bg-surface py-2 ps-3 pe-8 text-sm text-fg focus:border-primary focus:outline-none"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown
        size={14}
        aria-hidden
        className="pointer-events-none absolute end-3 text-fg-subtle"
      />
    </label>
  );
}
