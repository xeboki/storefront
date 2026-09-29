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
import { NodeLink } from '../NodeLink';
import type { MenuNode } from '@/lib/navigation';
import type { MenuStyleProps } from '../types';
import styles from './mega.module.css';

/**
 * At most this many columns, and at most this many links in each.
 *
 * The navigation research is consistent about both, and a mega menu drawn
 * badly is worse than no mega menu: past four columns the eye has nowhere to
 * land, and past eight links a column stops being scannable. A merchant who
 * builds more gets the rest behind the way out rather than a panel taller
 * than the screen.
 */
const MAX_COLUMNS = 4;
const PER_COLUMN = 8;

export default function MegaMenu({
  nodes, allHref, allLabel, linkCase, onDark, align, showAll,
}: MenuStyleProps) {
  const [open, setOpen] = useState<string | null>(null);
  const close = useCallback(() => setOpen(null), []);
  const ref = useDismiss(open !== null, close);
  useCloseOnScroll(open !== null, close);

  if (nodes.length === 0) return null;

  const panelFor = (node: MenuNode) => {
    // A column is a child with children. A child WITHOUT children is a link
    // in its own right, so the flat ones are gathered into one column rather
    // than each taking a column of its own and leaving four one-line stacks.
    const promos = node.children.filter((c) => c.imageUrl);
    const grouped = node.children.filter((c) => !c.imageUrl && c.children.length > 0);
    const loose = node.children.filter((c) => !c.imageUrl && c.children.length === 0);
    const columns: MenuNode[][] = grouped.slice(0, MAX_COLUMNS).map((c) => c.children.slice(0, PER_COLUMN));
    const headings = grouped.slice(0, MAX_COLUMNS);

    return (
      <div className={styles.panel} onMouseLeave={close} role="navigation" aria-label={node.label}>
        <div className={styles.inner}>
          <div className={styles.columns}>
            {headings.map((heading, i) => (
              <div key={heading.id} className={styles.column}>
                <p className={styles.heading}>{heading.label}</p>
                <ul className={styles.list}>
                  {columns[i].map((leaf) => (
                    <li key={leaf.id}>
                      <NodeLink node={leaf} className={styles.entry} onNavigate={close} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {loose.length > 0 && (
              <div className={styles.column}>
                <ul className={styles.list}>
                  {loose.slice(0, PER_COLUMN).map((leaf) => (
                    <li key={leaf.id}>
                      <NodeLink node={leaf} className={styles.entry} onNavigate={close} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {promos.slice(0, 2).map((promo) => (
            <NodeLink key={promo.id} node={promo} className={styles.promo} onNavigate={close}>
              {/* The merchant's own picture. Unoptimised on purpose: it is
                  their file at their dimensions, and a menu tile that waited
                  on a resize would pop in after the panel it sits in. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={promo.imageUrl} alt="" className={styles.promoImage} />
            </NodeLink>
          ))}
        </div>

        {showAll && (
          <Link href={allHref} onClick={close} className={styles.escape}>
            {allLabel}
            <ArrowRight size={15} />
          </Link>
        )}
      </div>
    );
  };

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
              {open === node.id && panelFor(node)}
            </div>
          ),
        )}
      </div>
    </div>
  );
}
