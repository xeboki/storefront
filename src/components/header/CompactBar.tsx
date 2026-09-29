'use client';

/**
 * What the header becomes once the reader is into the page.
 *
 * `condense` shaves the bar and folds the departments away; this replaces it.
 * Past the hero a shopper is reading, not choosing, and the header's job
 * changes with them: a way back, a way to everything, a way to search, and
 * the basket. Nothing else earns a permanent line of the screen on a page
 * they scroll for a minute.
 *
 * It is the same arrangement whatever style the shop chose. A style is how a
 * shop introduces itself, and by the time this appears the introduction has
 * happened — carrying six of them down the page would be six things to get
 * right for a bar nobody is looking at.
 */
import { clsx } from 'clsx';
import styles from './compact-bar.module.css';

interface Props {
  brand: React.ReactNode;
  menuIndex: React.ReactNode;
  search: React.ReactNode;
  action: React.ReactNode;
  cart: React.ReactNode;
  container: string;
}

export function CompactBar({ brand, menuIndex, search, action, cart, container }: Props) {
  return (
    <div className={clsx(container, styles.bar)}>
      {menuIndex}
      {brand}
      <div className={styles.end}>
        {action}
        {search}
        {cart}
      </div>
    </div>
  );
}
