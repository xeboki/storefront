'use client';

/**
 * A discount code a shopper can take with one press.
 *
 * The code used to sit inside the sentence — "12% off with AUTUMNWALK" — so
 * taking it meant selecting a run of letters by hand, which on a phone means
 * a long-press, a pair of drag handles and a good chance of catching the
 * words either side. A code exists to be typed into a box on another screen;
 * carrying it should not be the hard part of using the offer.
 *
 * It says what happened. A copy that reports nothing is indistinguishable
 * from a copy that failed, and the shopper finds out at the checkout, which
 * is the worst place to find out.
 *
 * It can fail honestly. `navigator.clipboard` needs a secure context and the
 * page's permission, and neither is guaranteed — a shop on plain http, an
 * embedded browser. When it does, the code is SELECTED instead, so the
 * ordinary copy still works and the shopper is not left pressing a button
 * that does nothing.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import styles from './copy-code.module.css';

/** Long enough to be read, short enough not to hide the code it replaced. */
const SAID_FOR_MS = 1800;

export function CopyCode({ code }: { code: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'select'>('idle');
  const ref = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  // A strip that rotates can unmount this mid-message; a timer still holding
  // a setState would then fire into nothing.
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = useCallback(async () => {
    clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(code);
      setState('copied');
    } catch {
      // Select it so the shopper's own copy works. Pressing the button is
      // then not wasted — it has done the fiddly part.
      const el = ref.current;
      if (el && typeof window !== 'undefined') {
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
      setState('select');
    }
    timer.current = setTimeout(() => setState('idle'), SAID_FOR_MS);
  }, [code]);

  return (
    <button
      ref={ref}
      type="button"
      onClick={copy}
      className={styles.code}
      // The code is in the label as well as in the face of the button: a
      // reader who hears "copy" alone has not been told what they would get.
      aria-label={`Copy discount code ${code}`}
      title={`Copy ${code}`}
    >
      <span className={styles.text}>{code}</span>
      {state === 'copied' ? (
        <>
          <Check size={12} aria-hidden />
          <span className={styles.said}>Copied</span>
        </>
      ) : state === 'select' ? (
        <span className={styles.said}>Press to copy</span>
      ) : (
        <Copy size={12} aria-hidden className={styles.icon} />
      )}
    </button>
  );
}
