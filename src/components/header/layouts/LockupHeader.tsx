'use client';

/**
 * Two rows: the mark and its tagline centred above, the departments below.
 *
 * The deepest header there is, and it spends that depth on two things no
 * other layout can afford. The mark gets its tagline — the lockup a shop
 * puts on its shopfront rather than the name alone. And the controls get
 * their names under them, because an icon a shopper has to recognise is a
 * small tax on every visit and this is the one header with room to stop
 * charging it.
 *
 * The search is a field rather than an icon: the top row has a whole column
 * for it, so hiding it behind a magnifier would be spending the room and
 * getting nothing for it.
 *
 * Equal side columns, so the lockup is centred on the PAGE. The departments
 * run along their own row underneath, left-aligned from the page margin.
 */
import { clsx } from 'clsx';
import type { HeaderLayoutProps } from '../layout-types';
import styles from './lockup.module.css';

export default function LockupHeader({
  brandLockup, search, menuBelow, utilityRowLabelled, container, barHeight,
}: HeaderLayoutProps) {
  return (
    <>
      <div className={clsx(container, styles.top, barHeight)}>
        <div className={styles.side}>{search}</div>
        {brandLockup}
        <div className={clsx(styles.side, styles.end)}>{utilityRowLabelled}</div>
      </div>
      {menuBelow}
    </>
  );
}
