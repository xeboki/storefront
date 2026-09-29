'use client';

/**
 * A button that opens the whole menu as a list, beside the departments.
 *
 * Not a replacement for the row next to it — an index INTO it. The row shows
 * what a shop wants seen and has only as much space as the bar allows; this
 * holds everything, in the order the merchant built it, however long that is.
 * A shopper who cannot find a department in the row has somewhere to look
 * that is not the search box.
 *
 * It drills in rather than expanding, for the same reason the side panel
 * does: a list that grows in place inside a narrow column pushes everything
 * below it down and loses the reader's place. The chevron points sideways
 * because that is where it goes.
 */
import { useCallback, useState } from 'react';
import { Menu, ChevronRight, ChevronLeft } from 'lucide-react';
import { clsx } from 'clsx';
import { AnchoredPanel } from './AnchoredPanel';
import { NodeLink } from './NodeLink';
import { useCloseOnScroll, useDismiss } from './chrome';
import type { MenuNode } from '@/lib/navigation';
import styles from './menu-index.module.css';

interface Props {
  nodes: MenuNode[];
  label: string;
  onDark: boolean;
}

export function MenuIndex({ nodes, label, onDark }: Props) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  /** The branch being looked at. Empty is the top of the menu. */
  const [trail, setTrail] = useState<MenuNode[]>([]);

  const close = useCallback(() => {
    setOpen(false);
    setAnchor(null);
    // Back to the top when it shuts. Reopening two levels into a branch
    // somebody left is a menu remembering something nobody asked it to.
    setTrail([]);
  }, []);
  const ref = useDismiss(open, close);
  useCloseOnScroll(open, close);

  if (nodes.length === 0) return null;

  const here = trail.length === 0 ? nodes : trail[trail.length - 1].children;
  const parent = trail[trail.length - 1];

  return (
    <div ref={ref} data-dark={onDark || undefined}>
      <button
        type="button"
        aria-expanded={open}
        onClick={(e) => {
          if (open) return close();
          setAnchor(e.currentTarget);
          setOpen(true);
        }}
        className={clsx(styles.trigger, open && styles.triggerOpen)}
      >
        <Menu size={16} />
        {label}
      </button>

      {open && (
        <AnchoredPanel anchor={anchor} minWidth={260}>
          <div className={styles.panel}>
            {parent && (
              <button
                type="button"
                onClick={() => setTrail((t) => t.slice(0, -1))}
                className={styles.back}
              >
                <ChevronLeft size={15} />
                {parent.label}
              </button>
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
                  <ChevronRight size={15} className={styles.chevron} />
                </button>
              ) : (
                <NodeLink key={node.id} node={node} onNavigate={close} className={styles.row} />
              ),
            )}

            {/* A branch that is itself a link: drilling in must not lose the
                way to it. */}
            {parent?.href && (
              <NodeLink
                node={{ ...parent, label: `All ${parent.label}`, children: [] }}
                onNavigate={close}
                className={clsx(styles.row, styles.all)}
              />
            )}
          </div>
        </AnchoredPanel>
      )}
    </div>
  );
}
