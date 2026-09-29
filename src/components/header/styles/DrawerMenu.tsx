'use client';

/**
 * A button, and the whole menu in a panel from the side.
 *
 * The least header a shop can have and still be navigable: for a business
 * where the mark is the point and the navigation should not compete with it.
 * It costs a click to reach any department, which is the trade.
 *
 * The panel is a page more than a list. It carries the shop's mark — without
 * it a shopper who opens it is looking at words over a dimmed page with
 * nothing saying whose shop it is — and a search field at the foot, because a
 * panel with room for the whole menu has room for the one thing somebody does
 * when the menu has not got what they came for.
 *
 * A row with something under it DRILLS IN rather than expanding in place. The
 * chevron points sideways because that is what it does: an accordion opening
 * inside a narrow column pushes everything below it down and loses the
 * shopper's place, and the navigation research is consistent that a
 * drill-down with a clear way back beats it in a panel this width.
 */
import { useCallback, useEffect, useState } from 'react';
import { Menu, X, ChevronRight, ChevronLeft } from 'lucide-react';
import { clsx } from 'clsx';
import { Portal } from '../Portal';
import { NodeLink } from '../NodeLink';
import type { MenuNode } from '@/lib/navigation';
import type { MenuStyleProps } from '../types';
import styles from './drawer.module.css';

export default function DrawerMenu({
  nodes, allHref, allLabel, menuLabel, linkCase, onDark, showAll, brand, search,
}: MenuStyleProps) {
  const [open, setOpen] = useState(false);
  /** The branch being looked at. Empty is the top of the menu. */
  const [trail, setTrail] = useState<MenuNode[]>([]);
  const close = useCallback(() => setOpen(false), []);

  // A panel over the page holds the scroll; letting the page move underneath
  // it is how a shopper closes the menu and finds themselves somewhere else.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Back to the top when it shuts. Reopening two levels deep into a branch
  // somebody left is a menu that remembers something they did not ask it to.
  useEffect(() => {
    if (!open) setTrail([]);
  }, [open]);

  if (nodes.length === 0) return null;

  const here = trail.length === 0 ? nodes : trail[trail.length - 1].children;
  const parent = trail[trail.length - 1];

  return (
    <div data-dark={onDark || undefined}>
      <button
        type="button"
        aria-expanded={open}
        aria-label={menuLabel}
        onClick={() => setOpen(true)}
        className={clsx(styles.trigger, linkCase === 'normal' && styles.normal)}
      >
        <Menu size={20} />
      </button>

      {open && (
        <Portal>
          <div className={styles.overlay}>
            <button type="button" aria-label="Close menu" className={styles.scrim} onClick={close} />
            <div className={styles.panel} role="navigation" aria-label={menuLabel}>
              <div className={styles.head}>
                <button type="button" onClick={close} aria-label="Close" className={styles.close}>
                  <X size={20} />
                </button>
              </div>

              {brand && <div className={styles.brand}>{brand}</div>}

              {/* Where the shopper is, and the way back out of it. Only ever
                  shown once they have gone in — at the top of the menu there
                  is nothing to go back to. */}
              {parent && (
                <button
                  type="button"
                  onClick={() => setTrail((t) => t.slice(0, -1))}
                  className={styles.back}
                >
                  <ChevronLeft size={16} />
                  {parent.label}
                </button>
              )}

              <nav className={styles.list}>
                {showAll && !parent && (
                  <a href={allHref} onClick={close} className={styles.row}>
                    <span>{allLabel}</span>
                  </a>
                )}

                {here.map((node) =>
                  node.children.length > 0 ? (
                    <button
                      key={node.id}
                      type="button"
                      onClick={() => setTrail((t) => [...t, node])}
                      className={clsx(styles.row, styles.branch)}
                    >
                      <span className={styles.label}>{node.label}</span>
                      <ChevronRight size={16} className={styles.chevron} />
                    </button>
                  ) : (
                    <NodeLink
                      key={node.id}
                      node={node}
                      onNavigate={close}
                      className={styles.row}
                    />
                  ),
                )}

                {/* A branch whose own entry is a link, not just a heading:
                    drilling in must not lose the way to it. */}
                {parent?.href && (
                  <NodeLink
                    node={{ ...parent, label: `All ${parent.label}`, children: [] }}
                    onNavigate={close}
                    className={clsx(styles.row, styles.all)}
                  />
                )}
              </nav>

              {search && <div className={styles.search}>{search}</div>}
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
