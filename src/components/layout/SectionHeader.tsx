import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface Props {
  eyebrow?: string;
  title: string;
  /** One line under the title. Keep it short — it is not body copy. */
  lede?: string;
  href?: string;
  linkLabel?: string;
  /** Centre for full-width editorial bands; left for grids. */
  align?: 'left' | 'center';
}

/**
 * One heading treatment for every band on the page.
 *
 * Sections were a bare bold 24px line each, identical to the one above, so a
 * page read as a stack of lists with no hierarchy. An eyebrow does the work a
 * second heading size would otherwise be asked to do.
 */
export function SectionHeader({
  eyebrow, title, lede, href, linkLabel = 'View all', align = 'left',
}: Props) {
  const centered = align === 'center';
  return (
    <div
      className={
        centered
          ? 'mb-10 text-center'
          : 'mb-10 flex flex-wrap items-end justify-between gap-4'
      }
    >
      <div className={centered ? 'mx-auto max-w-2xl' : 'max-w-2xl'}>
        {eyebrow && (
          <p className={`eyebrow ${centered ? '' : 'eyebrow-rule'} text-primary`}>{eyebrow}</p>
        )}
        <h2 className="display-lg mt-3 text-fg">{title}</h2>
        {lede && <p className="mt-3 text-fg-muted">{lede}</p>}
      </div>

      {href && !centered && (
        <Link
          href={href}
          className="group inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold text-primary hover:opacity-80"
        >
          {linkLabel}
          <ArrowRight
            size={15}
            className="motion-safe:transition-transform motion-safe:group-hover:translate-x-1"
          />
        </Link>
      )}
    </div>
  );
}
