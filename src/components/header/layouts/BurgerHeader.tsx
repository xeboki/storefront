'use client';

/**
 * Menu button left, mark centred, icons right.
 *
 * The spare arrangement: the bar carries a button, the shop's name and the
 * three things a shopper reaches for, and everything else lives behind the
 * button. It is what a shop uses when the mark is the point and the
 * navigation should not compete with it.
 *
 * Three columns with equal sides, so the mark is centred on the PAGE and not
 * on the gap between a button and a row of icons — those are never the same
 * width, and centring on what is left over is what makes a mark sit very
 * slightly off with no obvious reason.
 *
 * The menu is always the drawer here, whatever the shop chose elsewhere: a
 * bar with one button has nowhere to put a rail or a row of departments.
 */
import { clsx } from 'clsx';
import type { HeaderLayoutProps } from '../layout-types';
import styles from './burger.module.css';

export default function BurgerHeader({
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
