'use client';

/**
 * Style 5 — mark left, departments centred, icons right.
 *
 * The arrangement most shop themes actually ship: a wordmark hard left, the
 * departments in the middle of the bar where the eye lands first, and the
 * account/saved/cart icons hard right. One row, a hairline under it, nothing
 * else.
 *
 * Three columns with equal sides, so the departments are centred on the PAGE
 * and not on the gap between the mark and the icons — those two are never the
 * same width, so `justify-between` would put the menu off-centre by half the
 * difference and leave it looking almost right.
 *
 * It wants a short list: the middle column is what is left after a mark and
 * four or five icons, and departments past that fold into the menu's own
 * overflow rather than pushing the icons off the bar.
 */
import { clsx } from 'clsx';
import type { HeaderLayoutProps } from '../layout-types';
import styles from './centred-menu.module.css';

export default function CentredMenuHeader({
  brand, search, menu, menuEmpty, utilityRow, container, barHeight,
}: HeaderLayoutProps) {
  return (
    <div className={clsx(container, styles.bar, barHeight)}>
      {brand}
      <nav className={styles.middle}>{menuEmpty ? null : menu({ align: 'centre' })}</nav>
      <div className={styles.end}>
        {search}
        {utilityRow}
      </div>
    </div>
  );
}
