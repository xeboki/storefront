'use client';

/**
 * The departments in the bar itself, with no second row.
 *
 * The shallow header a small catalogue wants: every department is one click
 * away and the page starts higher up the screen. It stops working the moment
 * there are more departments than fit beside a logo and a search box, so the
 * ones past [VISIBLE] fold into a "More" panel rather than pushing the search
 * off the end of the bar.
 *
 * Which is a cliff, and it is on purpose: a menu that silently drops the last
 * department would be worse than one that says where it went.
 */
import Link from 'next/link';
import { useCallback, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';
import { useDismiss } from '../chrome';
import type { MenuStyleProps } from '../types';
import styles from './inline.module.css';

/**
 * How many sit in the bar before the rest fold away.
 *
 * Seven is the number the navigation research keeps landing on for a primary
 * bar — far enough down that a shopper can hold the shop in their head, and
 * about what fits beside a name and a search box at 1280px.
 */
const VISIBLE = 7;

export default function InlineMenu({ entries, allHref, allLabel, links, menuLabel }: MenuStyleProps) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useDismiss(open, close);

  const shown = entries.slice(0, VISIBLE);
  const rest = entries.slice(VISIBLE);
  const overflow = [
    ...rest.map((entry) => ({ key: entry.id, label: entry.label, href: entry.href, external: false })),
    ...links.map((link) => ({ key: link.url, label: link.label, href: link.url, external: link.external })),
  ];

  if (entries.length === 0 && links.length === 0) return null;

  return (
    <nav aria-label={allLabel} className="hidden lg:flex lg:min-w-0 lg:items-center lg:gap-1" ref={ref}>
      <Link href={allHref} className={styles.item}>
        {allLabel}
      </Link>
      {shown.map((entry) => (
        <Link key={entry.id} href={entry.href} className={styles.item}>
          {entry.label}
        </Link>
      ))}

      {overflow.length > 0 && (
        <div className="relative">
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className={clsx(styles.item, styles.trigger)}
          >
            {menuLabel}
            <ChevronDown size={14} className={clsx(styles.chevron, open && styles.chevronOpen)} />
          </button>
          {open && (
            <div className={styles.panel}>
              {overflow.map((item) =>
                item.external ? (
                  <a key={item.key} href={item.href} className={styles.panelItem} onClick={close}>
                    {item.label}
                  </a>
                ) : (
                  <Link key={item.key} href={item.href} className={styles.panelItem} onClick={close}>
                    {item.label}
                  </Link>
                ),
              )}
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
