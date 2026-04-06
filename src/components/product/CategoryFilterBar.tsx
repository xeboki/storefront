'use client';

import Link from 'next/link';
import { clsx } from 'clsx';
import type { OrderingCategory } from '@xeboki/sdk';

interface Props {
  categories: OrderingCategory[];
  activeId?: string;
  storeSlug: string;
}

export function CategoryFilterBar({ categories, activeId, storeSlug }: Props) {
  const visible = categories.filter((c) => c.id !== '_uncategorized');
  if (visible.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
      <Link
        href={`/${storeSlug}/catalog`}
        className={clsx(
          'whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium border transition-colors',
          !activeId
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-surface text-slate-600 border-slate-200 hover:border-primary hover:text-primary',
        )}
      >
        All
      </Link>
      {visible.map((cat) => (
        <Link
          key={cat.id}
          href={`/${storeSlug}/catalog?category=${cat.id}`}
          className={clsx(
            'whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium border transition-colors',
            activeId === cat.id
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-surface text-slate-600 border-slate-200 hover:border-primary hover:text-primary',
          )}
        >
          {cat.name}
        </Link>
      ))}
    </div>
  );
}
