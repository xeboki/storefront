import Link from 'next/link';
import type { OrderingCategory } from '@xeboki/sdk';

interface Props {
  categories: OrderingCategory[];
  storeSlug: string;
}

const CATEGORY_COLORS = [
  'bg-blue-50 text-blue-700 border-blue-200',
  'bg-green-50 text-green-700 border-green-200',
  'bg-purple-50 text-purple-700 border-purple-200',
  'bg-amber-50 text-amber-700 border-amber-200',
  'bg-rose-50 text-rose-700 border-rose-200',
  'bg-teal-50 text-teal-700 border-teal-200',
];

export function CategoryGrid({ categories, storeSlug }: Props) {
  const visible = categories.filter((c) => c.id !== '_uncategorized').slice(0, 6);

  if (visible.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
      {visible.map((category, idx) => (
        <Link
          key={category.id}
          href={`/${storeSlug}/catalog?category=${category.id}`}
          className={`flex flex-col items-center justify-center p-4 rounded-brand border font-medium text-sm hover:shadow-sm transition-shadow text-center ${CATEGORY_COLORS[idx % CATEGORY_COLORS.length]}`}
        >
          {category.icon && <span className="text-2xl mb-1">{category.icon}</span>}
          <span>{category.name}</span>
        </Link>
      ))}
    </div>
  );
}
