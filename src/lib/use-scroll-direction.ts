'use client';

import { useEffect, useRef, useState } from 'react';

export interface ScrollState {
  /** Scrolling down, past the threshold — collapse chrome that can wait. */
  hidden: boolean;
  /** Away from the very top, so the header can earn a shadow. */
  scrolled: boolean;
}

/**
 * Which way the page is moving, for chrome that should get out of the way.
 *
 * Reads on a rAF rather than on every scroll event: the handler fires far more
 * often than the screen refreshes, and doing layout work in it is how a scroll
 * starts to stutter on a phone.
 *
 * [threshold] keeps the bar still through the small movements a finger makes
 * while reading — collapsing on a 3px jitter feels broken, not responsive.
 */
export function useScrollDirection(threshold = 64): ScrollState {
  const [state, setState] = useState<ScrollState>({ hidden: false, scrolled: false });
  const last = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    last.current = window.scrollY;

    function read() {
      const y = Math.max(0, window.scrollY);
      const previous = last.current;
      // `last` always tracks the latest position. Deciding direction against a
      // stale anchor was the bug: a browser emits several scroll events as a
      // jump settles, and the ones with a tiny delta were left to decide.
      last.current = y;

      setState((prev) => {
        let hidden = prev.hidden;
        if (y <= threshold) hidden = false;          // near the top, always show
        else if (y > previous + 4) hidden = true;    // heading down
        else if (y < previous - 4) hidden = false;   // heading back up
        const scrolled = y > 8;
        return hidden === prev.hidden && scrolled === prev.scrolled
          ? prev                                     // no re-render for nothing
          : { hidden, scrolled };
      });
      ticking.current = false;
    }

    function onScroll() {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(read);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);

  return state;
}
