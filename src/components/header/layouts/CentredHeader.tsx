'use client';

/**
 * Style 2 — centred.
 *
 * Search left, mark in the middle, utilities right, departments on their own
 * row underneath and centred with them.
 *
 * Three columns with equal sides, not `justify-between`. Space-between
 * centres the mark on whatever is left over after the two sides, so it lands
 * off-centre by half the difference between them — which is why that layout
 * always looks very slightly wrong and nobody can say why.
 */
import { clsx } from 'clsx';
import type { HeaderLayoutProps } from '../layout-types';
import styles from './centred.module.css';

export default function CentredHeader({
  brand, search, menuBelow, utilityRow, container, barHeight,
}: HeaderLayoutProps) {
  return (
    <>
      <div className={clsx(container, styles.bar, barHeight)}>
        <div className={styles.side}>{search}</div>
        {brand}
        <div className={clsx(styles.side, styles.end)}>{utilityRow}</div>
      </div>
      {menuBelow}
    </>
  );
}
