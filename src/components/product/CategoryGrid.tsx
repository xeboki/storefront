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
    // Tall tiles on a portrait ratio, the way a department is presented in a
    // shop rather than a row of small square buttons.
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {visible.map((category) => (
        <Link
          key={category.id}
          href={`/${storeSlug}/catalog?category=${category.id}`}
          className="lift group relative flex aspect-[4/5] flex-col items-center justify-end overflow-hidden rounded-brand-lg border border-line bg-surface p-4 text-center"
        >
          {/* A wash of the brand colour that deepens on hover, so the tiles
              read as a set rather than six empty boxes. */}
          <span
            aria-hidden
            className="absolute inset-0 bg-gradient-to-b from-primary/5 to-primary/20 motion-safe:transition-opacity motion-safe:duration-300 group-hover:opacity-0"
          />
          <span
            aria-hidden
            className="absolute inset-0 bg-gradient-to-b from-primary/20 to-primary/50 opacity-0 motion-safe:transition-opacity motion-safe:duration-300 group-hover:opacity-100"
          />

          <span className="relative flex flex-1 items-center justify-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface/80 text-primary shadow-sm backdrop-blur motion-safe:transition-transform motion-safe:duration-300 group-hover:scale-110">
              <CategoryIcon icon={category.icon} name={category.name} className="h-6 w-6" />
            </span>
          </span>

          <span className="relative mt-3 text-sm font-semibold leading-snug text-fg line-clamp-2">
            {category.name}
          </span>
        </Link>
      ))}
    </div>
  );
}
