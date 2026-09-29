'use client';

/**
 * Style 4 — split.
 *
 * Departments, mark, departments — the centred mark with navigation either
 * side. Squarespace dropped it in 7.1 and people are still writing CSS to get
 * it back, which is a fair measure of how much it is wanted.
 *
 * It wants a short list, three or four a side. The departments go in the bar
 * itself, so it only applies to a menu that puts them there; anything else
 * falls back to a centred mark before it reaches this file.
 *
 * The way out to the whole catalogue sits on the first half only — one escape
 * hatch per header — and the shop's own links go with the second, where the
 * eye finishes.
 */
import { clsx } from 'clsx';
import type { HeaderLayoutProps } from '../layout-types';
import styles from './split.module.css';

export default function SplitHeader({
  brand, search, menu, departments, utilityRow, container, barHeight,
}: HeaderLayoutProps) {
  const half = Math.ceil(departments / 2);
  return (
    <div className={clsx(container, styles.bar, barHeight)}>
      <div className={styles.side}>{menu({ to: half })}</div>
      {brand}
      <div className={clsx(styles.side, styles.end)}>
        {menu({ from: half, showAll: false })}
        {search}
        {utilityRow}
      </div>
    </div>
  );
}
