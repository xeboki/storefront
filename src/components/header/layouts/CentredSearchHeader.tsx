'use client';

/**
 * Mark left, search centred, departments centred on a row of their own.
 *
 * The two-row header again, with the weight moved: the mark anchors the left
 * edge rather than taking the middle, and the middle goes to search. For a
 * shop where finding a thing is the point — a big catalogue, a parts
 * supplier, anywhere a shopper arrives knowing what they want.
 *
 * It keeps what the deep header is for: the tagline under the mark and the
 * controls named rather than guessed at.
 *
 * Equal side columns, which is what centres the search on the PAGE rather
 * than on the gap between a mark and a row of icons — those are never the
 * same width. The departments centre under it for the same reason, through
 * `centreMenu` rather than through this file, because only the menu knows
 * how to centre a row that might be too long to centre safely.
 */
import { clsx } from 'clsx';
import type { HeaderLayoutProps } from '../layout-types';
import styles from './centred-search.module.css';

export default function CentredSearchHeader({
  brandLockup, search, menuBelow, utilityRowLabelled, container, barHeight,
}: HeaderLayoutProps) {
  return (
    <>
      <div className={clsx(container, styles.top, barHeight)}>
        <div className={styles.side}>{brandLockup}</div>
        <div className={styles.middle}>{search}</div>
        <div className={clsx(styles.side, styles.end)}>{utilityRowLabelled}</div>
      </div>
      {menuBelow}
    </>
  );
}
