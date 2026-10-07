'use client';

/**
 * The menu as a scrolling row under the bar.
 *
 * Copes with any number of entries and hides none, at the cost of a second
 * row and of the far end being off screen. It is the default because it is
 * the only one of the four that cannot be wrong: a shop with sixty entries
 * gets sixty, and a shop with three gets three.
 *
 * An entry with a submenu opens a panel under itself.
 *
 * This was "top level only", on the argument that a panel hanging off a
 * strip a finger drags sideways is not something anybody can aim at. The
 * argument is sound and the conclusion was not: the rail is the DEFAULT, so
 * a merchant who built a menu with submenus in the back office and never
 * chose a style had them silently dropped, with nothing anywhere saying so.
 * Authoring something the shop quietly ignores is worse than a panel that is
 * awkward to aim at while the strip is moving.
 *
 * The aiming problem is handled rather than avoided: `useCloseOnScroll` shuts
 * the panel the moment the page moves, so it is never left pointing at a
 * trigger that has slid away.
 *
 * The panel itself is `MegaPanel` — the same one the mega menu opens. A first
 * attempt built a flat dropdown here instead, and flattening is exactly what
 * loses the thing the merchant made: the back end describes a submenu as
 * columns, picture tiles and a strip (`menu_display`), and subscriber 34's
 * "Shops" is four headed columns of eight links plus a promo tile. One list
 * of thirty-three names is not that menu.
 *
 * The row folds away on the way down the page and returns on the way up —
 * `condense`. Animating a height to `auto` is not possible and a fixed
 * max-height either clips a wrapped row or leaves dead space under a short
 * one, so it is a grid track going 1fr → 0fr, which does animate.
 */
import { useCallback, useState } from 'react';
import Link from 'next/link';
import { clsx } from 'clsx';
import { ChevronDown } from 'lucide-react';
import { ScrollRail } from '../../layout/ScrollRail';
import { useCloseOnScroll, useDismiss } from '../chrome';
import { MegaPanel } from '../MegaPanel';
import { NodeLink } from '../NodeLink';
import type { MenuNode } from '@/lib/navigation';
import type { MenuStyleProps } from '../types';
import styles from './rail.module.css';

export default function RailMenu({
  nodes, allHref, allLabel, collapsed, linkCase, onDark, align, showAll,
}: MenuStyleProps) {
  const [open, setOpen] = useState<string | null>(null);
  const close = useCallback(() => setOpen(null), []);
  const dismissRef = useDismiss(open !== null, close);
  // The row folds away as the page moves; a panel hanging off a trigger in
  // it would be left pointing at nothing.
  useCloseOnScroll(open !== null, close);
  const show = useCallback((id: string) => setOpen(id), []);

  // Hooks first: this returns early below, and a hook after a return runs on
  // some renders and not others.
  const item = clsx(
    'flex items-center whitespace-nowrap transition-colors',
    onDark ? 'text-white/80 hover:text-white' : 'text-fg-muted hover:text-primary',
  );

  if (nodes.length === 0) return null;

  /** A link, or a trigger when the merchant gave it a submenu. */
  const entry = (node: MenuNode) =>
    node.children.length === 0 ? (
      <NodeLink key={node.id} node={node} className={item} />
    ) : (
      <button
        key={node.id}
        type="button"
        aria-expanded={open === node.id}
        onClick={() => show(node.id)}
        onMouseEnter={() => show(node.id)}
        onFocus={() => show(node.id)}
        className={clsx(item, 'gap-1')}
      >
        {node.label}
        <ChevronDown
          size={14}
          className={clsx(styles.chevron, open === node.id && styles.chevronOpen)}
        />
      </button>
    );

  const openNode = nodes.find((n) => n.id === open) ?? null;

  return (
    <nav
      ref={dismissRef}
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
          {nodes.map(entry)}
        </ScrollRail>
      </div>
      {openNode && (
        <MegaPanel
          node={openNode}
          close={close}
          allHref={allHref}
          allLabel={allLabel}
          showAll={showAll}
        />
      )}
    </nav>
  );
}
