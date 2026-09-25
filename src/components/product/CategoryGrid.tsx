import Link from 'next/link';
import type { OrderingCategory } from '@xeboki/sdk';
import { CategoryIcon } from './CategoryIcon';

interface Props {
  categories: OrderingCategory[];
  storeSlug: string;
}

export function CategoryGrid({ categories, storeSlug }: Props) {
  const visible = categories.filter((c) => c.id !== '_uncategorized').slice(0, 6);

  if (visible.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {visible.map((category) => (
        <Link
          key={category.id}
          href={`/${storeSlug}/catalog?category=${category.id}`}
          className="group flex flex-col items-center justify-center gap-2 rounded-brand border border-line bg-surface p-4 text-center text-sm font-medium text-fg transition-colors hover:border-primary hover:bg-surface-alt"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-brand bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
            <CategoryIcon icon={category.icon} name={category.name} />
          </span>
          <span className="line-clamp-2">{category.name}</span>
        </Link>
      ))}
    </div>
  );
}
