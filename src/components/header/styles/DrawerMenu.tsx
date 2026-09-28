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
import type { MenuStyleProps } from '../types';
import styles from './drawer.module.css';

export default function DrawerMenu({
  entries, allHref, allLabel, links, menuLabel, linkCase, onDark, align, showAll,
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

  if (entries.length === 0 && links.length === 0) return null;

  return (
    <div className={clsx('hidden lg:block', align === 'centre' && 'text-center')} data-dark={onDark || undefined}>
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
              {entries.map((entry) => (
                <Link key={entry.id} href={entry.href} onClick={close} className={styles.entry}>
                  <span>{entry.label}</span>
                  {entry.count > 0 && <span className={styles.count}>{entry.count}</span>}
                </Link>
              ))}
              {links.length > 0 && <hr className={styles.rule} />}
              {links.map((link) =>
                link.external ? (
                  <a key={link.url} href={link.url} onClick={close} className={styles.entry}>
                    {link.label}
                  </a>
                ) : (
                  <Link key={link.url} href={link.url} onClick={close} className={styles.entry}>
                    {link.label}
                  </Link>
                ),
              )}
            </nav>
          </div>
        </div>
        </Portal>
      )}
    </div>
  );
}
