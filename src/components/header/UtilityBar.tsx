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
 *
 * **It rotates.** The strip is one line, and it used to take one joined
 * sentence: a shop running five promotions had the tail of its own strip
 * truncated away, and capping the list only dropped the same offers more
 * quietly. Each message now gets the line to itself, in turn, so nothing is
 * lost however many are running and nothing is cut off mid-word.
 *
 * All of them stay in the DOM, stacked in one grid cell — which also sizes
 * the band to the tallest without anybody guessing a height. A reader using
 * a screen reader gets every message rather than whichever happened to be
 * showing, and none of them is announced again on each turn.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import { CopyCode } from './CopyCode';
import type { OfferLine } from '@/lib/offers';
import styles from './utility-bar.module.css';

/**
 * How long a line holds, by the name the merchant picked in the back office.
 *
 * The pace belongs to the shop, not to this file: two short lines want five
 * seconds and five long offer names do not fit in five seconds, and only the
 * merchant can see which of those their strip is. The names and the seconds
 * are the server's — the same four a slideshow's interval uses, so "slow"
 * means nine seconds wherever a merchant meets it.
 *
 * `off` is a still strip with its arrows, for a shop whose first line is the
 * one that matters.
 */
export const DWELL_MS: Record<string, number> = {
  'slow':   9000,
  'normal': 5000,
  'fast':   3000,
};

interface Props {
  lines: OfferLine[];
  controls: React.ReactNode;
  container: string;
  /** slow | normal | fast | off, from the merchant's header settings. */
  rotate: string;
}

export function UtilityBar({ lines, controls, container, rotate }: Props) {
  const [index, setIndex] = useState(0);
  const [held, setHeld] = useState(false);
  const many = lines.length > 1;

  // Somebody may be part-way through reading a line, or copying a code off
  // it, when the timer fires. Pointer or keyboard, the rule is the same.
  const hold = useCallback(() => setHeld(true), []);
  const release = useCallback(() => setHeld(false), []);

  const step = useCallback(
    (by: number) => setIndex((i) => (i + by + lines.length) % lines.length),
    [lines.length],
  );

  // A list that shrinks under a reader — a promotion ends — must not leave
  // the strip pointing past the end of it.
  const count = lines.length;
  useEffect(() => {
    setIndex((i) => (count === 0 ? 0 : i % count));
  }, [count]);

  const reduced = useRef(false);
  useEffect(() => {
    reduced.current =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  }, []);

  useEffect(() => {
    // Nothing to rotate, or somebody is reading. Reduced motion stops the
    // automatic turn and leaves the arrows, so the other messages are still
    // reachable rather than hidden from the people who asked for less
    // movement.
    // 'off' is the merchant asking for the same thing on purpose.
    const dwell = DWELL_MS[rotate];
    if (!many || held || reduced.current || !dwell) return;
    const t = setInterval(() => step(1), dwell);
    return () => clearInterval(t);
  }, [many, held, step, rotate]);

  if (lines.length === 0) return null;

  return (
    <div
      className={styles.band}
      onMouseEnter={hold}
      onMouseLeave={release}
      onFocusCapture={hold}
      onBlurCapture={release}
    >
      <div className={clsx(container, styles.inner)}>
        <p className={styles.message}>
          {lines.map((line, i) => (
            <span
              key={line.text + (line.code ?? '')}
              className={clsx(styles.line, i === index && styles.shown)}
            >
              {line.text}
              {line.code && <CopyCode code={line.code} />}
            </span>
          ))}
        </p>
        <div className={styles.controls}>
          {many && (
            <span className={styles.steps}>
              <button
                type="button"
                onClick={() => step(-1)}
                aria-label="Previous announcement"
                className={styles.step}
              >
                <ChevronLeft size={13} />
              </button>
              <button
                type="button"
                onClick={() => step(1)}
                aria-label="Next announcement"
                className={styles.step}
              >
                <ChevronRight size={13} />
              </button>
            </span>
          )}
          {controls}
        </div>
      </div>
    </div>
  );
}
