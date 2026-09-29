'use client';

/**
 * Style 1 — classic.
 *
 * Mark left, departments beside it, search, utilities right. The arrangement
 * nearly every shop starts on, and the one this storefront drew before styles
 * existed — so it is also what a shop that has never chosen gets.
 *
 * Where the departments land is the menu's call here rather than this style's:
 * a rail is a row under the bar and an inline list is in it, and classic is
 * the one arrangement that is happy either way.
 */
import { clsx } from 'clsx';
import type { HeaderLayoutProps } from '../layout-types';
import styles from './classic.module.css';

export default function ClassicHeader({
  brand, search, menuInBar, menuBelow, utilityRow, container, barHeight,
}: HeaderLayoutProps) {
  return (
    <>
      <div className={clsx(container, styles.bar, barHeight)}>
        {brand}
        {menuInBar}
        {search}
        <div className={styles.end}>{utilityRow}</div>
      </div>
      {menuBelow}
    </>
  );
}
