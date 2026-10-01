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
  /**
   * Hold the eyebrow's line even when there is no eyebrow.
   *
   * For a band inside a row, where the column beside it is a different band
   * with its own heading. "Back in stock" had no eyebrow and "THE COLLECTION
   * / All eight" did, so the two titles sat **17px apart** across a row that
   * is read as one thing — the optional-line fault this codebase keeps
   * finding, this time between columns rather than inside one.
   *
   * Only in a column. A full-width band has nothing to line up with, and
   * reserving the line there would push every heading on the page down for
   * nothing.
   */
  reserveEyebrow?: boolean;
}

/**
 * One heading treatment for every band on the page.
 *
 * Sections were a bare bold 24px line each, identical to the one above, so a
 * page read as a stack of lists with no hierarchy. An eyebrow does the work a
 * second heading size would otherwise be asked to do.
 */
export function SectionHeader({
  eyebrow, title, lede, href, linkLabel, align = 'left',
  reserveEyebrow = false,
}: Props) {
  const centered = align === 'center';
  // A default parameter cannot do this job. Every band spreads `{...w}`,
  // and `bandWords` always returns all four keys — so a band whose own
  // defaults do not name a `linkLabel` passes an EMPTY STRING, which is a
  // value, which means the default never applies. On a restaurant the menu
  // band and the locations band each rendered a bare arrow with no words
  // next to it and no accessible name at all.
  const label = linkLabel || 'View all';

  // Nothing to say. A band in a column is not offered its own default
  // heading (see `bandWords`), so an empty header here is ordinary rather
  // than a mistake — and drawing it anyway left an empty `display-lg` line
  // plus `mb-10` of margin, which is the invisible-hole fault this file has
  // been fixed for before. The link is still worth keeping on its own.
  if (!title && !eyebrow && !lede) {
    if (!href || centered) return null;
    return (
      <div className="mb-10 flex justify-end">
        <Link
          href={href}
          className="group inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold text-primary hover:opacity-80"
        >
          {label}
          <ArrowRight
            size={15}
            className="motion-safe:transition-transform motion-safe:group-hover:translate-x-1"
          />
        </Link>
      </div>
    );
  }

  return (
    <div
      className={
        centered
          ? 'mb-10 text-center'
          : 'mb-10 flex flex-wrap items-end justify-between gap-4'
      }
    >
      <div className={centered ? 'mx-auto max-w-2xl' : 'max-w-2xl'}>
        {eyebrow ? (
          <p className={`eyebrow ${centered ? '' : 'eyebrow-rule'} text-primary`}>{eyebrow}</p>
        ) : reserveEyebrow ? (
          // The line, kept empty. `aria-hidden` because there is nothing to
          // read — this is spacing that happens to be made of text, so that
          // it scales with the eyebrow it is standing in for rather than
          // being a hard-coded margin that drifts the moment the type does.
          <p className="eyebrow" aria-hidden="true">&nbsp;</p>
        ) : null}
        {title && <h2 className="display-lg mt-3 text-fg">{title}</h2>}
        {lede && <p className="mt-3 text-fg-muted">{lede}</p>}
      </div>

      {href && !centered && (
        <Link
          href={href}
          className="group inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold text-primary hover:opacity-80"
        >
          {label}
          <ArrowRight
            size={15}
            className="motion-safe:transition-transform motion-safe:group-hover:translate-x-1"
          />
        </Link>
      )}
    </div>
  );
}
