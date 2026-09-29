'use client';

/**
 * A panel under a control, drawn outside whatever is clipping it.
 *
 * A dropdown belongs to the entry that opened it, so the obvious thing is to
 * position it against that entry — and then one ancestor with `overflow:
 * hidden` makes it invisible while leaving it in the DOM, present and the
 * right size and painted nowhere. That is what happened here: the row of
 * departments clips, so that a name arriving late cannot paint across the
 * search box, and the clip took the dropdowns with it.
 *
 * `overflow-x: hidden` with `overflow-y: visible` is not a way out — CSS
 * computes the visible axis to `auto` the moment the other is hidden. So the
 * panel goes to the body and carries its own position.
 *
 * It follows its anchor rather than closing on scroll: this header is sticky,
 * so a shopper scrolling with a menu open is reading the page behind it, not
 * finishing with the menu.
 */
import { useCallback, useEffect, useState } from 'react';
import { Portal } from './Portal';

interface Props {
  anchor: HTMLElement | null;
  children: React.ReactNode;
  /** Keeps the panel on screen when its anchor is near the right edge. */
  minWidth?: number;
}

export function AnchoredPanel({ anchor, children, minWidth = 208 }: Props) {
  const [box, setBox] = useState<{ top: number; left: number } | null>(null);

  const place = useCallback(() => {
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    // Hangs from the left of its anchor, unless that would run it off the
    // right of the window — then it hangs from the right instead.
    const left = Math.min(r.left, Math.max(8, window.innerWidth - minWidth - 8));
    setBox({ top: r.bottom + 8, left });
  }, [anchor, minWidth]);

  useEffect(() => {
    if (!anchor) {
      setBox(null);
      return;
    }
    place();
    window.addEventListener('scroll', place, { passive: true });
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place);
      window.removeEventListener('resize', place);
    };
  }, [anchor, place]);

  if (!anchor || !box) return null;

  return (
    <Portal>
      <div style={{ position: 'fixed', top: box.top, left: box.left, zIndex: 50 }}>
        {children}
      </div>
    </Portal>
  );
}
