'use client';

/**
 * Top-level entries in the bar; the ones with a submenu open a panel the
 * width of the header.
 *
 * Each top-level entry is its own trigger, the way every shop theme does it —
 * not one "Menu" button for the whole shop. That was the shape a flat
 * department list forced, and it meant the panel could only ever be one
 * undifferentiated grid of everything.
 *
 * With a tree, the panel is what the merchant built: each child of the open
 * entry is a column, that child's own label is the column's heading, and its
 * children are the links under it. A child carrying a picture becomes a promo
 * tile instead — the last column in most themes.
 *
 * A top-level entry with no submenu is just a link. A shop can mix them.
 */
import { useCallback, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ArrowRight } from 'lucide-react';
import { clsx } from 'clsx';
import { useCloseOnScroll, useDismiss } from '../chrome';
import { MegaPanel } from '../MegaPanel';
import { NodeLink } from '../NodeLink';
import type { MenuStyleProps } from '../types';
import styles from './mega.module.css';

export default function MegaMenu({
  nodes, allHref, allLabel, linkCase, onDark, align, showAll,
}: MenuStyleProps) {
  const [open, setOpen] = useState<string | null>(null);
  const close = useCallback(() => setOpen(null), []);
  const ref = useDismiss(open !== null, close);
  useCloseOnScroll(open !== null, close);

  if (nodes.length === 0) return null;

  return (
    <div
      className={clsx('hidden lg:block', align === 'centre' && styles.centred)}
      ref={ref}
      data-dark={onDark || undefined}
    >
      <div className={styles.bar}>
        {nodes.map((node) =>
          node.children.length === 0 ? (
            <NodeLink
              key={node.id}
              node={node}
              className={clsx(styles.trigger, linkCase === 'upper' && styles.upper)}
            />
          ) : (
            <div key={node.id} className={styles.slot}>
              <button
                type="button"
                aria-expanded={open === node.id}
                aria-haspopup="true"
                // Open-only, deliberately. Hovering opens the panel, so a
                // toggle means the click a shopper instinctively makes on the
                // thing they just pointed at closes what they were reaching
                // for. It shuts on the way out, on Escape, and on a click
                // anywhere else — none of which is the control they aimed at.
                onClick={() => setOpen(node.id)}
                onMouseEnter={() => setOpen(node.id)}
                onFocus={() => setOpen(node.id)}
                className={clsx(styles.trigger, linkCase === 'upper' && styles.upper)}
              >
                {node.label}
                <ChevronDown
                  size={14}
                  className={clsx(styles.chevron, open === node.id && styles.chevronOpen)}
                />
              </button>
              {open === node.id && (
                <MegaPanel
                  node={node}
                  close={close}
                  allHref={allHref}
                  allLabel={allLabel}
                  showAll={showAll}
                />
              )}
            </div>
          ),
        )}
      </div>
    </div>
  );
}
