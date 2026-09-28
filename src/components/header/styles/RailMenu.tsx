'use client';

/**
 * The departments as a scrolling row under the bar.
 *
 * Copes with any number of them and hides none, at the cost of a second row
 * and of the far end being off screen. It is the default because it is the
 * only one of the four that cannot be wrong: a shop with sixty departments
 * gets sixty, and a shop with three gets three.
 *
 * The row folds away on the way down the page and returns on the way up —
 * `condense`. Animating a height to `auto` is not possible and a fixed
 * max-height either clips a wrapped row or leaves dead space under a short
 * one, so it is a grid track going 1fr → 0fr, which does animate.
 */
import Link from 'next/link';
import { clsx } from 'clsx';
import { ScrollRail } from '../../layout/ScrollRail';
import type { MenuStyleProps } from '../types';
import styles from './rail.module.css';

export default function RailMenu({
  entries, allHref, allLabel, links, collapsed, linkCase, onDark,
}: MenuStyleProps) {
  if (entries.length === 0 && links.length === 0) return null;

  return (
    <nav
      aria-label={allLabel}
      className={clsx(
        styles.rail,
        collapsed && styles.folded,
        'hidden sm:grid',
        onDark ? 'border-t border-white/15' : 'border-t border-line',
      )}
    >
      <div className="overflow-hidden">
        <ScrollRail
          fade={onDark ? 'from-transparent' : 'from-surface'}
          className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
          trackClassName={clsx(
            'flex items-center gap-6 py-3 text-sm font-medium',
            // Was always uppercase. Shouting is now the shop's call, not a
            // decision baked into one of the four menus.
            linkCase === 'upper' && 'uppercase tracking-wide',
          )}
        >
          <Link href={allHref} className="whitespace-nowrap text-fg transition-colors hover:text-primary">
            {allLabel}
          </Link>
          {entries.map((entry) => (
            <Link
              key={entry.id}
              href={entry.href}
              className={clsx(
                'whitespace-nowrap transition-colors',
                onDark ? 'text-white/80 hover:text-white' : 'text-fg-muted hover:text-primary',
              )}
            >
              {entry.label}
            </Link>
          ))}
          {links.map((link) =>
            link.external ? (
              <a key={link.url} href={link.url} className={clsx('whitespace-nowrap transition-colors', onDark ? 'text-white/80 hover:text-white' : 'text-fg-muted hover:text-primary')}>
                {link.label}
              </a>
            ) : (
              <Link key={link.url} href={link.url} className={clsx('whitespace-nowrap transition-colors', onDark ? 'text-white/80 hover:text-white' : 'text-fg-muted hover:text-primary')}>
                {link.label}
              </Link>
            ),
          )}
        </ScrollRail>
      </div>
    </nav>
  );
}
