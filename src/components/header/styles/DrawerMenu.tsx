'use client';

/**
 * A menu button, and a panel in from the side.
 *
 * The least header a shop can have and still be navigable: for a business
 * selling one line, where the bar should be a name and a cart and nothing
 * else. It costs a click to reach any department, which is the trade — and
 * why the back office says so beside the name rather than leaving a merchant
 * to find out from their own analytics.
 *
 * It is the only one of the four that behaves the same on a phone as on a
 * desktop, so a shop that chooses it gets one menu to think about.
 */
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { clsx } from 'clsx';
import { useDismiss } from '../chrome';
import { Portal } from '../Portal';
import { NodeLink } from '../NodeLink';
import type { MenuNode } from '@/lib/navigation';
import type { MenuStyleProps } from '../types';
import styles from './drawer.module.css';

export default function DrawerMenu({
  nodes, allHref, allLabel, menuLabel, linkCase, onDark, align, showAll,
}: MenuStyleProps) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useDismiss(open, close);

  // A panel over the page holds the scroll; letting the page move underneath
  // it is how a shopper closes the menu and finds themselves somewhere else.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (nodes.length === 0) return null;

  /** The whole tree as an indented list — a panel has the height for it. */
  const branch = (node: MenuNode, depth: number): React.ReactNode => (
    <div key={node.id} style={{ paddingLeft: depth * 12 }}>
      <NodeLink
        node={node}
        onNavigate={close}
        className={depth === 0 && node.children.length > 0 ? styles.group : styles.entry}
      />
      {node.children.map((child) => branch(child, depth + 1))}
    </div>
  );

  return (
    <div className={clsx('hidden lg:block', align === 'centre' && styles.centred)} data-dark={onDark || undefined}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className={clsx(styles.trigger, linkCase === 'normal' && styles.normal)}
      >
        <Menu size={18} />
        {menuLabel}
      </button>

      {open && (
        <Portal>
        <div className={styles.overlay}>
          <button type="button" aria-label="Close menu" className={styles.scrim} onClick={close} />
          <div className={styles.panel} ref={ref} role="navigation" aria-label={menuLabel}>
            <div className={styles.head}>
              <span className={styles.headLabel}>{menuLabel}</span>
              <button type="button" onClick={close} aria-label="Close" className={styles.close}>
                <X size={18} />
              </button>
            </div>

            <nav className={styles.list}>
              {showAll && (
                <Link href={allHref} onClick={close} className={styles.all}>
                  {allLabel}
                </Link>
              )}
              {nodes.map((node) => branch(node, 0))}
            </nav>
          </div>
        </div>
        </Portal>
      )}
    </div>
  );
}
