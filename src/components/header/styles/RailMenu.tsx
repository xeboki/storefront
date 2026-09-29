'use client';

/**
 * The menu as a scrolling row under the bar.
 *
 * Copes with any number of entries and hides none, at the cost of a second
 * row and of the far end being off screen. It is the default because it is
 * the only one of the four that cannot be wrong: a shop with sixty entries
 * gets sixty, and a shop with three gets three.
 *
 * Top level only. A rail is a strip a finger drags sideways, and a panel
 * hanging off a strip that is itself moving is not something anybody can
 * aim at — a shop that wants submenus wants one of the other three.
 *
 * The row folds away on the way down the page and returns on the way up —
 * `condense`. Animating a height to `auto` is not possible and a fixed
 * max-height either clips a wrapped row or leaves dead space under a short
 * one, so it is a grid track going 1fr → 0fr, which does animate.
 */
import Link from 'next/link';
import { clsx } from 'clsx';
import { ScrollRail } from '../../layout/ScrollRail';
import { NodeLink } from '../NodeLink';
import type { MenuStyleProps } from '../types';
import styles from './rail.module.css';

export default function RailMenu({
  nodes, allHref, allLabel, collapsed, linkCase, onDark, align, showAll,
}: MenuStyleProps) {
  if (nodes.length === 0) return null;

  const item = clsx(
    'flex items-center whitespace-nowrap transition-colors',
    onDark ? 'text-white/80 hover:text-white' : 'text-fg-muted hover:text-primary',
  );

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
            align === 'centre' && '[justify-content:safe_center]',
            // Was always uppercase. Shouting is now the shop's call, not a
            // decision baked into one of the four menus.
            linkCase === 'upper' && 'uppercase tracking-wide',
          )}
        >
          {showAll && (
            <Link
              href={allHref}
              className={clsx(
                'whitespace-nowrap transition-colors',
                onDark ? 'text-white hover:text-white/80' : 'text-fg hover:text-primary',
              )}
            >
              {allLabel}
            </Link>
          )}
          {nodes.map((node) => (
            <NodeLink key={node.id} node={node} className={item} />
          ))}
        </ScrollRail>
      </div>
    </nav>
  );
}
