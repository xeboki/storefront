'use client';

/**
 * What the header is made of and what it does as the page moves.
 *
 * Two axes the merchant sets separately, resolved here so the header itself
 * reads as a list of parts rather than a chain of conditionals.
 */
import { useEffect, useRef, useState } from 'react';

export const SCROLLS = ['condense', 'fixed', 'hide', 'static'] as const;
export const SURFACES = ['solid', 'transparent', 'gradient', 'inverse', 'floating'] as const;

/**
 * Where the shop's mark sits, and what the menu does around it.
 *
 * Dawn calls this `logo_position` and every platform has some version of it;
 * it is the setting that makes a header look like a different shop. `split`
 * is the centred mark with departments either side that Squarespace dropped
 * in 7.1 and people are still writing CSS to get back.
 */
export const LOGO_POSITIONS = ['left', 'centred', 'stacked', 'split'] as const;

/** Sentence case or SHOUTING. Was hardcoded, and differently per menu. */
export const LINK_CASES = ['normal', 'upper'] as const;

export type Scroll = (typeof SCROLLS)[number];
export type Surface = (typeof SURFACES)[number];
export type LogoPosition = (typeof LOGO_POSITIONS)[number];
export type LinkCase = (typeof LINK_CASES)[number];

export function asScroll(value: string | null | undefined): Scroll {
  return (SCROLLS as readonly string[]).includes(value ?? '') ? (value as Scroll) : 'condense';
}

export function asSurface(value: string | null | undefined): Surface {
  return (SURFACES as readonly string[]).includes(value ?? '') ? (value as Surface) : 'solid';
}

export function asLogoPosition(value: string | null | undefined): LogoPosition {
  return (LOGO_POSITIONS as readonly string[]).includes(value ?? '')
    ? (value as LogoPosition)
    : 'left';
}

export function asLinkCase(value: string | null | undefined): LinkCase {
  return (LINK_CASES as readonly string[]).includes(value ?? '') ? (value as LinkCase) : 'upper';
}

/** The two surfaces that only mean anything over a picture. */
export const OVER_BANNER_SURFACES: readonly Surface[] = ['transparent', 'gradient'];

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
/**
 * Marks a panel that belongs to the control which opened it.
 *
 * A panel drawn through a portal is a child of <body>, not of its trigger, so
 * "did this click land inside?" cannot be answered by walking up from the
 * target to the trigger's ref — every click in the panel looked like a click
 * outside. That shut the menu instead of drilling into it, and on a panel of
 * links it unmounted them before the click could land at all.
 */
export const PANEL_ATTR = 'data-header-panel';

export function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') close();
    }
    function onPointer(event: PointerEvent) {
      const target = event.target as Element | null;
      if (ref.current?.contains(target as Node)) return;
      // …or inside a panel this control put on the body.
      if (target?.closest?.(`[${PANEL_ATTR}]`)) return;
      close();
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
 * Shuts an open panel once the page moves under it.
 *
 * Not a nicety: the header is allowed to condense or hide as a shopper
 * scrolls, and both take the control the panel is hanging from with them. A
 * panel that stayed would be pointing at a trigger that had folded away — or
 * worse, floating over the page attached to nothing.
 *
 * [SLACK] px of tolerance so a trackpad twitch or the browser's own scroll
 * correction — the header changing height IS a scroll — does not count as
 * the shopper moving on.
 */
const SLACK = 24;

export function useCloseOnScroll(open: boolean, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const from = window.scrollY;
    let frame = 0;
    const read = () => {
      frame = 0;
      if (Math.abs(window.scrollY - from) > SLACK) close();
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [open, close]);
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
