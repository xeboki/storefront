'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { clsx } from 'clsx';
import type { OrderingCategory } from '@xeboki/sdk';

interface Props {
  categories: OrderingCategory[];
  activeId?: string;
  storeSlug: string;
  className?: string;
}

/**
 * Category chips.
 *
 * Each link carries the REST of the query with it. They used to be a bare
 * `?category=`, so choosing a category threw away the shopper's search, their
 * sort and their chosen store — they picked "Clothing" and silently got the
 * unsorted everything of another branch.
 */
export function CategoryFilterBar({ categories, activeId, storeSlug, className }: Props) {
  const params = useSearchParams();
  const visible = categories.filter((c) => c.id !== '_uncategorized');
  if (visible.length === 0) return null;

  function hrefFor(categoryId: string | null): string {
    const p = new URLSearchParams(params.toString());
    if (categoryId) p.set('category', categoryId);
    else p.delete('category');
    p.delete('page'); // a new filter starts at page 1
    const qs = p.toString();
    return qs ? `/${storeSlug}/catalog?${qs}` : `/${storeSlug}/catalog`;
  }

  const chip = (active: boolean) =>
    clsx(
      'whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium border transition-colors',
      active
        ? 'bg-primary text-primary-foreground border-primary'
        : 'bg-surface text-fg-muted border-line hover:border-primary hover:text-primary',
    );

  return (
    <div className={clsx('flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide', className)}>
      <Link href={hrefFor(null)} className={chip(!activeId)}>
        All
      </Link>
      {visible.map((cat) => (
        <Link key={cat.id} href={hrefFor(cat.id)} className={chip(activeId === cat.id)}>
          {cat.name}
        </Link>
      ))}
    </div>
  );
}
