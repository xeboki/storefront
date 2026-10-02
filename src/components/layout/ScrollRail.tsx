'use client';

/**
 * A horizontal strip that admits when it has more to show.
 *
 * The category rail and the catalog's filter chips were plain `overflow-x-auto`
 * containers: on a wide screen they simply stopped mid-word at the right edge
 * with nothing to say more existed, so the last categories were invisible to
 * anyone who did not think to drag sideways.
 *
 * A fade appears on whichever side has content beyond it, and arrows appear
 * when there is somewhere to go — both driven by the element's real scroll
 * position, so neither shows when everything already fits.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  /**
   * Tailwind `from-*` colour for the edge fades — it has to match whatever the
   * rail sits on, or the fade reads as a smudge.
   */
  fade?: string;
  className?: string;
  /** Inner track classes (gap, padding, text style). */
  trackClassName?: string;
}

export function ScrollRail({
  children,
  fade = 'from-surface',
  className = '',
  trackClassName = '',
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    // A pixel of slack: sub-pixel layout means scrollLeft rarely lands exactly
    // on the ends, which would leave a fade showing over nothing.
    setAtStart(el.scrollLeft <= 1);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    measure();
    el.addEventListener('scroll', measure, { passive: true });
    // Categories arrive after the first paint and the window can be resized,
    // so re-measure on both rather than trusting one reading at mount.
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    for (const child of Array.from(el.children)) observer.observe(child);
    return () => {
      el.removeEventListener('scroll', measure);
      observer.disconnect();
    };
  }, [measure]);

  function nudge(direction: -1 | 1) {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: direction * Math.max(200, el.clientWidth * 0.7), behavior: 'smooth' });
  }

  const arrow =
    'absolute top-1/2 z-10 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-surface text-fg-muted shadow-sm transition-colors hover:text-fg sm:flex';

  return (
    <div className={`relative ${className}`}>
      {!atStart && (
        <>
          <span
            aria-hidden
            className={`pointer-events-none absolute inset-y-0 start-0 z-[5] w-10 bg-gradient-to-r ${fade} to-transparent`}
          />
          <button
            type="button"
            onClick={() => nudge(-1)}
            aria-label="Scroll left"
            className={`${arrow} start-0`}
          >
            <ChevronLeft size={16} />
          </button>
        </>
      )}

      <div ref={ref} className={`overflow-x-auto scrollbar-hide ${trackClassName}`}>
        {children}
      </div>

      {!atEnd && (
        <>
          <span
            aria-hidden
            className={`pointer-events-none absolute inset-y-0 end-0 z-[5] w-10 bg-gradient-to-l ${fade} to-transparent`}
          />
          <button
            type="button"
            onClick={() => nudge(1)}
            aria-label="Scroll right"
            className={`${arrow} end-0`}
          >
            <ChevronRight size={16} />
          </button>
        </>
      )}
    </div>
  );
}
