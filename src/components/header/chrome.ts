'use client';

/**
 * What the header is made of and what it does as the page moves.
 *
 * Two axes the merchant sets separately, resolved here so the header itself
 * reads as a list of parts rather than a chain of conditionals.
 */
import { useEffect, useRef, useState } from 'react';

export const SCROLLS = ['condense', 'fixed', 'hide', 'static'] as const;
export const SURFACES = ['solid', 'transparent', 'floating'] as const;

export type Scroll = (typeof SCROLLS)[number];
export type Surface = (typeof SURFACES)[number];

export function asScroll(value: string | null | undefined): Scroll {
  return (SCROLLS as readonly string[]).includes(value ?? '') ? (value as Scroll) : 'condense';
}

export function asSurface(value: string | null | undefined): Surface {
  return (SURFACES as readonly string[]).includes(value ?? '') ? (value as Surface) : 'solid';
}

/**
 * Close on Escape, and on a click that lands outside.
 *
 * Written once because three of the four menu styles open a panel, and a panel
 * that only closes by clicking its own trigger again is the thing everybody
 * gets wrong — a shopper who opens a mega menu and then clicks a product
 * behind it has both told it to close and told the page to move.
 *
 * `pointerdown`, not `click`: a click fires after the browser has already
 * followed the link under it, so the panel would shut on a page that has
 * gone. Capture phase for the same reason.
 */
export function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') close();
    }
    function onPointer(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node)) close();
    }

    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer, true);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer, true);
    };
  }, [open, close]);

  return ref;
}

/**
 * Whether a panel may be transparent right now.
 *
 * `transparent` only means anything over a picture. A shop that chose it and
 * then has a page with no banner — a product, a cart, an account — would get
 * a header sitting on the page background with nothing behind its type, so it
 * starts solid everywhere except where there is something to sit on, and turns
 * solid the moment the page moves under it.
 */
export function useOverBanner(enabled: boolean): boolean {
  const [over, setOver] = useState(enabled);

  useEffect(() => {
    if (!enabled) {
      setOver(false);
      return;
    }
    let frame = 0;
    const read = () => {
      frame = 0;
      setOver(window.scrollY < 8);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    read();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [enabled]);

  return over;
}
