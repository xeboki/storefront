'use client';

/**
 * Mark in the middle, departments to one side of it, icons to the other.
 *
 * The mark is the centrepiece and the menu is a single run, which is the
 * arrangement a lot of fashion and editorial shops use.
 *
 * It used to cut the departments in half and put a few either side of the
 * mark. That reads badly and is worth saying why: a menu is one list in one
 * order, and halving it around a logo breaks the run in the middle — the eye
 * finishes the left group, jumps the mark, and starts again, so two entries
 * that belong beside each other end up on opposite sides of the bar. It also
 * fails on any shop whose icons are wider than its mark, because the half
 * sharing a column with them gets squeezed to a "More" button.
 *
 * Three columns with equal sides, so the mark is centred on the PAGE rather
 * than on the gap between a menu and a row of icons — those are never the
 * same width, and centring on what is left over is what makes a mark look
 * very slightly off with no obvious reason.
 */
import { clsx } from 'clsx';
import type { HeaderLayoutProps } from '../layout-types';
import styles from './split.module.css';

export default function SplitHeader({
  brand, search, menu, menuEmpty, utilityRow, container, barHeight,
}: HeaderLayoutProps) {
  return (
    <div className={clsx(container, styles.bar, barHeight)}>
      <div className={styles.side}>{menuEmpty ? null : menu()}</div>
      {brand}
      <div className={clsx(styles.side, styles.end)}>
        {search}
        {utilityRow}
      </div>
    </div>
  );
}
