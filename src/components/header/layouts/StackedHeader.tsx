'use client';

/**
 * Style 3 — stacked.
 *
 * Mark left with search and utilities beside it, then the departments on a
 * full row of their own underneath.
 *
 * The most room for departments and the most header, which is the trade. It
 * pairs with "stays, and tightens" — the second row is exactly the space
 * that behaviour gives back once a shopper starts reading.
 */
import { clsx } from 'clsx';
import type { HeaderLayoutProps } from '../layout-types';
import styles from './stacked.module.css';

export default function StackedHeader({
  brand, search, menuBelow, utilityRow, container, barHeight,
}: HeaderLayoutProps) {
  return (
    <>
      <div className={clsx(container, styles.bar, barHeight)}>
        {brand}
        {search}
        <div className={styles.end}>{utilityRow}</div>
      </div>
      {menuBelow}
    </>
  );
}
