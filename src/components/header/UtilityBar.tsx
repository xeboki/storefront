'use client';

/**
 * The thin band above the bar.
 *
 * It exists to take three controls OUT of the header: the store picker, the
 * language switcher and the currency. Those three describe the shop rather
 * than serve the shopper, they are wide — a store picker carries a town name
 * — and they are precisely what stops a centred layout being centred. Half
 * the styles drop them for that reason. Up here they cost the bar nothing
 * and the merchant gets them back.
 *
 * It is NOT a style. Every layout can have one, which is the point: a
 * seventh style called "the same but with a strip" would mean a with-strip
 * twin of all six.
 *
 * It scrolls away. The bar below it is the one that sticks — a shop's
 * delivery terms are worth saying once, not worth a permanent line of the
 * screen.
 */
import { clsx } from 'clsx';
import styles from './utility-bar.module.css';

interface Props {
  message: string;
  controls: React.ReactNode;
  container: string;
}

export function UtilityBar({ message, controls, container }: Props) {
  return (
    <div className={styles.band}>
      <div className={clsx(container, styles.inner)}>
        {/* Truncates rather than wraps: this is one line by definition, and a
            message long enough to need two has outgrown a strip. */}
        <p className={styles.message}>{message}</p>
        <div className={styles.controls}>{controls}</div>
      </div>
    </div>
  );
}
