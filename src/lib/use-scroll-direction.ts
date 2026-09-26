'use client';

import { useEffect, useRef, useState } from 'react';

export interface ScrollState {
  /** Scrolling down, past the threshold — collapse chrome that can wait. */
  hidden: boolean;
  /** Away from the very top, so the header can earn a shadow. */
  scrolled: boolean;
}

/** How far the page has to travel one way before the bar believes it. */
const COMMIT = 24;
/**
 * How long to stop listening after a flip.
 *
 * The rail's collapse is a 300ms transition, and it changes the height of a
 * sticky header — which is content above everything else on the page. The
 * browser moves the page to compensate, frame by frame, for as long as that
 * animation runs. Those are scrolls this hook caused; reading them as the
 * reader's intent is what made the bar flicker on the way back up: the rail
 * opened, the page shifted down, that read as "scrolling down", the rail shut,
 * the page shifted back, and round it went for as long as a finger moved.
 */
const SETTLE_MS = 380;

/**
 * Which way the page is moving, for chrome that should get out of the way.
 *
 * Reads on a rAF rather than on every scroll event: the handler fires far more
 * often than the screen refreshes, and doing layout work in it is how a scroll
 * starts to stutter on a phone.
 *
 * Direction is committed from an anchor rather than compared frame to frame.
 * A per-frame comparison answers "which way did the last 16ms go", and near the
 * top of a page — where a finger wobbles, momentum settles and the browser is
 * still correcting for the header's own animation — that question has no stable
 * answer. The anchor asks the one that does: has the page travelled [COMMIT]
 * pixels one way since it last changed its mind?
 *
 * [threshold] keeps the bar open near the top of the page. It sits well clear
 * of the rail's own height on purpose: if the two were close, collapsing the
 * rail could carry the page back across the line that forces it open again,
 * and the pair would sit there switching.
 */
export function useScrollDirection(threshold = 140): ScrollState {
  const [state, setState] = useState<ScrollState>({ hidden: false, scrolled: false });
  /** What was last published — read in the rAF, which is outside React. */
  const current = useRef<ScrollState>({ hidden: false, scrolled: false });
  /** Where the page last changed direction — what COMMIT is measured from. */
  const anchor = useRef(0);
  const lastY = useRef(0);
  const goingDown = useRef(false);
  /** Ignore everything until this moment; a flip is still settling. */
  const deaf = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    anchor.current = window.scrollY;
    lastY.current = window.scrollY;

    function read() {
      ticking.current = false;
      const y = Math.max(0, window.scrollY);
      const previous = lastY.current;
      lastY.current = y;

      if (performance.now() < deaf.current) {
        // Still settling. Keep the anchor under the page so the next real
        // movement is measured from where it actually ended up.
        anchor.current = y;
        return;
      }

      // A turn resets what the commit is measured from, so a reversal needs
      // its own COMMIT pixels rather than inheriting the run before it.
      const down = y > previous;
      if (previous !== y && down !== goingDown.current) {
        goingDown.current = down;
        anchor.current = previous;
      }

      // Worked out here rather than inside the updater: an updater has to be
      // pure, and React is free to run it twice.
      const prev = current.current;
      let hidden = prev.hidden;
      if (y <= threshold) {
        hidden = false;
      } else if (y - anchor.current > COMMIT) {
        hidden = true;
      } else if (anchor.current - y > COMMIT) {
        hidden = false;
      }
      const scrolled = y > 8;

      if (hidden === prev.hidden && scrolled === prev.scrolled) return;
      if (hidden !== prev.hidden) {
        deaf.current = performance.now() + SETTLE_MS;
        anchor.current = y;
      }
      current.current = { hidden, scrolled };
      setState(current.current);
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
