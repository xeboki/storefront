'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { PromoPopup } from '@xeboki/sdk';

interface Props {
  popup: PromoPopup;
  storeSlug: string;
}

/**
 * The notice a shop shows a first-time visitor.
 *
 * The Promotions screen has written these five settings since it shipped and
 * nothing read them: a merchant switched the notice on, got "Saved", and their
 * shop never showed it.
 *
 * An interruption has to be easy to leave. Escape closes it, so does the
 * backdrop, so does the button, and it remembers within the visit — the
 * version of this feature that appears on every page a shopper opens is the
 * one that makes them leave.
 */
export function PromoNotice({ popup, storeSlug }: Props) {
  const [shown, setShown] = useState(false);
  const close = useRef<HTMLButtonElement>(null);
  const key = `xbk-notice:${storeSlug}`;

  const dismiss = useCallback(() => {
    setShown(false);
    if (!popup.oncePerSession) return;
    try {
      sessionStorage.setItem(key, '1');
    } catch {
      // Private windows and blocked site data throw here. A notice that
      // reappears is a small annoyance; a page that breaks on it is not.
    }
  }, [key, popup.oncePerSession]);

  useEffect(() => {
    if (!popup.enabled) return;
    if (popup.oncePerSession) {
      try {
        if (sessionStorage.getItem(key)) return;
      } catch {
        // Cannot tell whether it has been seen — show it. Showing it twice is
        // better than a merchant's notice never appearing at all.
      }
    }
    const timer = window.setTimeout(() => setShown(true), popup.delaySeconds * 1000);
    return () => window.clearTimeout(timer);
  }, [popup.enabled, popup.oncePerSession, popup.delaySeconds, key]);

  // Escape closes it, and focus lands on the way out so a keyboard is not left
  // somewhere behind the overlay.
  useEffect(() => {
    if (!shown) return;
    close.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shown, dismiss]);

  if (!popup.enabled || !shown) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={popup.title ? 'promo-notice-title' : undefined}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={dismiss}
        className="absolute inset-0 cursor-default bg-black/55 motion-safe:animate-in motion-safe:fade-in"
      />

      <div className="relative w-full max-w-md rounded-2xl bg-surface p-6 shadow-2xl ring-1 ring-black/5 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4">
        <button
          ref={close}
          type="button"
          onClick={dismiss}
          aria-label="Close"
          className="absolute end-3 top-3 rounded-full p-1.5 text-fg-muted transition-colors hover:bg-fg/5 hover:text-fg"
        >
          <X size={18} />
        </button>

        {popup.title && (
          <h2
            id="promo-notice-title"
            className="pe-8 font-display text-xl font-semibold text-fg"
          >
            {popup.title}
          </h2>
        )}

        {popup.message && (
          <p className={`text-sm leading-relaxed text-fg-muted ${popup.title ? 'mt-2' : 'pe-8'}`}>
            {popup.message}
          </p>
        )}

        <button
          type="button"
          onClick={dismiss}
          className="mt-5 w-full rounded-full bg-primary-solid px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
