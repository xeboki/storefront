'use client';

/**
 * Search that takes the header over, rather than squeezing into it.
 *
 * The icon opens a bar the width of the page: the shop's mark stays where it
 * was, a labelled field sits in the middle, the icons stay on the right, and
 * a cross closes it. The page behind dims.
 *
 * It exists because the other two behaviours both cost something a header
 * with a centred menu cannot pay. A field that is always there takes the
 * middle of the bar, which is where the departments are. An icon that opens
 * sideways grows into the same space and pushes them out of the way. This one
 * borrows the whole row for as long as somebody is typing and gives it back.
 *
 * Rendered through a portal for the usual reason: the header carries
 * `backdrop-filter`, which makes it the containing block for anything fixed
 * inside it, so a full-page dim drawn in place would be the size of the bar.
 */
import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { clsx } from 'clsx';
import { HeaderSearch } from '../layout/HeaderSearch';
import { Portal } from './Portal';
import { useT } from '@/lib/i18n/client';
import styles from './search-overlay.module.css';

interface Props {
  storeSlug: string;
  iconClassName: string;
  /** The mark, so the open bar is still recognisably this shop's header. */
  brand: React.ReactNode;
  /**
   * The account, saved and cart controls.
   *
   * They stay. The bar is borrowed, not replaced — a shopper who opens search
   * and then decides to check their basket should not have to close anything
   * first, and a header whose right-hand side empties out reads as having
   * navigated somewhere.
   */
  utilities: React.ReactNode;
  container: string;
}

export function SearchOverlay({
  storeSlug, iconClassName, brand, utilities, container,
}: Props) {
  const [open, setOpen] = useState(false);
  const field = useRef<HTMLDivElement>(null);
  const t = useT();

  useEffect(() => {
    if (!open) return;
    // Opening it and leaving the cursor somewhere else is a button that looks
    // like it did nothing.
    field.current?.querySelector('input')?.focus();
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

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('search.placeholder')}
        aria-expanded={open}
        className={clsx(iconClassName, 'hidden md:flex')}
      >
        <Search size={20} />
      </button>

      {open && (
        <Portal>
          <div className={styles.overlay}>
            <button
              type="button"
              aria-label="Close search"
              className={styles.scrim}
              onClick={() => setOpen(false)}
            />
            <div className={styles.sheet} role="search">
              <div className={clsx(container, styles.row)}>
                <div className={styles.brand}>{brand}</div>
                <div className={styles.field} ref={field}>
                  <span className={styles.label}>{t('search.label')}</span>
                  <HeaderSearch storeSlug={storeSlug} labelled />
                </div>
                <div className={styles.end}>{utilities}</div>
              </div>

              {/* In the corner of the sheet rather than in the row: it closes
                  the whole bar, not anything in it, and a control that undoes
                  a thing belongs at the edge of the thing it undoes. */}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className={styles.close}
              >
                <X size={22} />
              </button>
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
