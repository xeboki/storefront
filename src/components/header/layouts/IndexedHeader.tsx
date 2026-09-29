'use client';

/**
 * Mark left, search centred, and a department bar led by an index button.
 *
 * The bar underneath is the difference. It opens with a button holding the
 * WHOLE menu as a list, and then runs the departments beside it — so the row
 * shows what the shop wants seen while nothing is out of reach. A shopper
 * who cannot find a department in the row has somewhere to look that is not
 * the search box.
 *
 * The bar is banded rather than hairlined: it is a second surface, not a
 * continuation of the first, and giving it its own ground is what stops the
 * two rows reading as one tall header.
 */
import { clsx } from 'clsx';
import type { HeaderLayoutProps } from '../layout-types';
import styles from './indexed.module.css';

export default function IndexedHeader({
  brandLockup, search, menuIndex, menuBelow, menuEmpty,
  utilityRowLabelled, container, barHeight, rule,
}: HeaderLayoutProps) {
  return (
    <>
      <div className={clsx(container, styles.top, barHeight)}>
        <div className={styles.side}>{brandLockup}</div>
        <div className={styles.middle}>{search}</div>
        <div className={clsx(styles.side, styles.end)}>{utilityRowLabelled}</div>
      </div>

      {!menuEmpty && (
        <div className={clsx(styles.band, rule)}>
          <div className={clsx(container, styles.bandInner)}>
            {menuIndex}
            <div className={styles.departments}>{menuBelow}</div>
          </div>
        </div>
      )}
    </>
  );
}
