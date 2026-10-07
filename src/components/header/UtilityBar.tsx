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
import styles from './utility-bar.module.css';

/** Long enough to read a line and copy a code off it. */
const DWELL_MS = 5000;

interface Props {
  messages: string[];
  controls: React.ReactNode;
  container: string;
}

export function UtilityBar({ messages, controls, container }: Props) {
  const [index, setIndex] = useState(0);
  const [held, setHeld] = useState(false);
  const many = messages.length > 1;

  // Somebody may be part-way through reading a line, or copying a code off
  // it, when the timer fires. Pointer or keyboard, the rule is the same.
  const hold = useCallback(() => setHeld(true), []);
  const release = useCallback(() => setHeld(false), []);

  const step = useCallback(
    (by: number) => setIndex((i) => (i + by + messages.length) % messages.length),
    [messages.length],
  );

  // A list that shrinks under a reader — a promotion ends — must not leave
  // the strip pointing past the end of it.
  const count = messages.length;
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
    if (!many || held || reduced.current) return;
    const t = setInterval(() => step(1), DWELL_MS);
    return () => clearInterval(t);
  }, [many, held, step]);

  if (messages.length === 0) return null;

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
          {messages.map((m, i) => (
            <span
              key={m}
              className={clsx(styles.line, i === index && styles.shown)}
              // Hidden from sight, not from a reader: all of them are here
              // so the shop's offers are readable and indexable at once.
              aria-hidden={undefined}
            >
              {m}
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
