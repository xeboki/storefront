'use client';

/**
 * Everything at once, in columns, behind one word in the bar.
 *
 * For a catalogue too big for a row and too big for a list — the panel is the
 * only arrangement that lets a shopper see the whole shop without scrolling
 * through it. The shape follows what the navigation research is consistent
 * about, because a mega menu drawn badly is worse than no mega menu:
 *
 *   · at most [MAX_COLUMNS] columns, so the eye has somewhere to land;
 *   · at most [PER_COLUMN] departments in each, so a column is scannable;
 *   · one escape hatch — "everything" — because the commonest thing a shopper
 *     wants from a menu is out of it.
 *
 * Past what the columns hold, the rest go to the catalogue page rather than
 * making the panel taller than the screen. A shop with two hundred departments
 * is not one a panel can show, and pretending otherwise is the failure mode.
 */
import Link from 'next/link';
import { useCallback, useState } from 'react';
import { ChevronDown, ArrowRight } from 'lucide-react';
import { clsx } from 'clsx';
import { useDismiss } from '../chrome';
import type { MenuStyleProps } from '../types';
import styles from './mega.module.css';

const MAX_COLUMNS = 4;
const PER_COLUMN = 8;

/** Split into as few columns as will hold them, never more than [MAX_COLUMNS]. */
function columnise<T>(items: T[]): T[][] {
  if (items.length === 0) return [];
  const count = Math.min(MAX_COLUMNS, Math.ceil(items.length / PER_COLUMN) || 1);
  const size = Math.ceil(items.length / count);
  return Array.from({ length: count }, (_, i) => items.slice(i * size, (i + 1) * size));
}

export default function MegaMenu({
  entries, allHref, allLabel, links, menuLabel, linkCase, onDark,
}: MenuStyleProps) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useDismiss(open, close);

  if (entries.length === 0 && links.length === 0) return null;

  const shown = entries.slice(0, MAX_COLUMNS * PER_COLUMN);
  const spilled = entries.length - shown.length;
  const columns = columnise(shown);

  return (
    <div className="hidden lg:block" ref={ref} data-dark={onDark || undefined}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        className={clsx(styles.trigger, linkCase === 'upper' && styles.upper)}
      >
        {menuLabel}
        <ChevronDown size={15} className={clsx(styles.chevron, open && styles.chevronOpen)} />
      </button>

      {open && (
        <div
          className={styles.panel}
          onMouseLeave={close}
          role="navigation"
          aria-label={menuLabel}
        >
          <div className={styles.inner}>
            <div className={styles.columns}>
              {columns.map((column, index) => (
                <ul key={index} className={styles.column}>
                  {column.map((entry) => (
                    <li key={entry.id}>
                      <Link href={entry.href} onClick={close} className={styles.entry}>
                        {/* The department's own colour from the till. A shop
                            that never set one gets no dot rather than a grey
                            one pretending to be a category. */}
                        {entry.colour && (
                          <span
                            aria-hidden
                            className={styles.dot}
                            style={{ background: entry.colour }}
                          />
                        )}
                        <span className={styles.entryLabel}>{entry.label}</span>
                        {entry.count > 0 && <span className={styles.count}>{entry.count}</span>}
                      </Link>
                    </li>
                  ))}
                </ul>
              ))}
            </div>

            {links.length > 0 && (
              <ul className={styles.aside}>
                {links.map((link) =>
                  link.external ? (
                    <li key={link.url}>
                      <a href={link.url} onClick={close} className={styles.asideLink}>
                        {link.label}
                      </a>
                    </li>
                  ) : (
                    <li key={link.url}>
                      <Link href={link.url} onClick={close} className={styles.asideLink}>
                        {link.label}
                      </Link>
                    </li>
                  ),
                )}
              </ul>
            )}
          </div>

          {/* The way out. Also where the departments go that the columns
              could not hold, said plainly rather than hidden. */}
          <Link href={allHref} onClick={close} className={styles.escape}>
            {spilled > 0 ? `${allLabel} (${spilled} more)` : allLabel}
            <ArrowRight size={15} />
          </Link>
        </div>
      )}
    </div>
  );
}
