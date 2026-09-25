'use client';

/**
 * The in-stock toggle for the catalog.
 *
 * This used to sit beside a search box on the catalog page. Search now lives
 * in the header, on every page, so only the availability control is left here
 * — two search fields on one screen was the shopper's first hint that nobody
 * had looked at the page as a whole.
 */
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

interface Props {
  checked: boolean;
  /** True in location-first browsing, where the catalog is always in-stock. */
  locked?: boolean;
  className?: string;
}

export function InStockFilter({ checked, locked = false, className = '' }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  if (locked) return null;

  function toggle(next: boolean) {
    const p = new URLSearchParams(params.toString());
    if (next) p.set('instock', '1');
    else p.delete('instock');
    p.delete('page');
    router.push(`${pathname}?${p.toString()}`, { scroll: false });
  }

  return (
    <label className={`flex items-center gap-2 whitespace-nowrap text-sm text-fg-muted ${className}`}>
      <input type="checkbox" checked={checked} onChange={(e) => toggle(e.target.checked)} />
      In stock only
    </label>
  );
}
