'use client';

/**
 * The search field, promoted into the header.
 *
 * Search used to live only on the catalog page, so finding a product from
 * anywhere else meant navigating to the shop first and looking for a box.
 * Submitting lands on the catalog with `?q=`, which is where the server-side
 * search already runs.
 */
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { useT } from '@/lib/i18n/client';

export function HeaderSearch({ storeSlug, className = '' }: { storeSlug: string; className?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const t = useT();
  // Seeded from the URL: after searching, the term a shopper typed has to stay
  // visible in the box they typed it into, or the results look unexplained.
  const active = params.get('q') ?? '';
  const [query, setQuery] = useState(active);
  useEffect(() => setQuery(active), [active]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/${storeSlug}/catalog?q=${encodeURIComponent(q)}` : `/${storeSlug}/catalog`);
  }

  return (
    <form onSubmit={submit} role="search" className={className}>
      <div className="relative">
        <Search
          size={16}
          aria-hidden
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-fg-subtle"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('search.placeholder')}
          aria-label={t('search.placeholder')}
          className="h-11 w-full rounded-full border border-line bg-surface-alt pl-11 pr-4 text-sm text-fg placeholder:text-fg-subtle focus:border-primary focus:bg-surface focus:outline-none"
        />
      </div>
    </form>
  );
}
