import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { OrderingCategory } from '@xeboki/sdk';

interface Props {
  categories: OrderingCategory[];
  storeSlug: string;
}

/**
 * The department index.
 *
 * This was six small squares each holding an icon — and where a category had
 * no icon, its first letter. A grid of lettered boxes reads as a placeholder
 * somebody forgot to finish, and most catalogues have no category artwork to
 * rescue it with.
 *
 * So it is set as an index instead: a number, a name, a rule. Typography is
 * the only material here, which means it looks deliberate with no imagery at
 * all — and it is the treatment that survives a merchant who has ten
 * departments rather than four.
 */
export function CategoryGrid({ categories, storeSlug }: Props) {
  const visible = categories.filter((c) => c.id !== '_uncategorized').slice(0, 8);
  if (visible.length === 0) return null;

  return (
    <ul className="grid grid-cols-1 gap-x-12 sm:grid-cols-2">
      {visible.map((category, index) => (
        <li key={category.id}>
          <Link
            href={`/${storeSlug}/catalog?category=${category.id}`}
            className="group flex items-baseline gap-5 border-b border-line py-5 transition-colors hover:border-primary"
          >
            <span className="price text-xs font-medium text-fg-subtle transition-colors group-hover:text-primary">
              {String(index + 1).padStart(2, '0')}
            </span>

            <span className="min-w-0 flex-1">
              <span className="block truncate text-xl font-medium text-fg transition-colors group-hover:text-primary sm:text-2xl">
                {category.name}
              </span>
            </span>

            <ArrowUpRight
              size={18}
              aria-hidden
              className="flex-shrink-0 text-fg-subtle motion-safe:transition-all motion-safe:duration-300 group-hover:text-primary motion-safe:group-hover:-translate-y-0.5 motion-safe:group-hover:translate-x-0.5"
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}
