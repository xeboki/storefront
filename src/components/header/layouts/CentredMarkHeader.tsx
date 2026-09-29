'use client';

/**
 * Departments left, mark centred, everything else right.
 *
 * The mark is the centrepiece and the navigation runs along one side of it.
 * Unlike the other two centred arrangements this one keeps the wide controls
 * — a language switcher, a currency — because the menu on the left is itself
 * wide, so the two sides weigh about the same and the mark still lands in the
 * middle of the page.
 *
 * Three columns with equal sides, which is what centres the mark on the PAGE
 * rather than on the gap between whatever happens to be either side of it.
 * The menu is left-aligned in its column, not centred: it is a run of entries
 * reading outward from the edge, and centring it would leave a gap against
 * the page margin with no reason for being there.
 */
import { clsx } from 'clsx';
import type { HeaderLayoutProps } from '../layout-types';
import styles from './centred-mark.module.css';

export default function CentredMarkHeader({
  brand, search, menuInBar, utilityRow, container, barHeight,
}: HeaderLayoutProps) {
  return (
    <div className={clsx(container, styles.bar, barHeight)}>
      <div className={styles.side}>{menuInBar}</div>
      {brand}
      <div className={clsx(styles.side, styles.end)}>
        {search}
        {utilityRow}
      </div>
    </div>
  );
}
