'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { HeroSlideshow as Settings } from '@xeboki/sdk';
import type { ResolvedSlide } from '@/lib/hero-slides';
import { INTERVAL_MS } from '@/lib/hero-slides';
import { HeroSlideView } from './HeroSlideView';
import { bannerStyle } from '@/components/banners/registry';
import { Indicators } from '@/components/banners/Indicators';

interface Props {
  slides: ResolvedSlide[];
  settings: Settings;
}

/** Fixed heights. `adapt` keeps the layout's own padding, as the hero always did. */
const HEIGHT: Record<string, string> = {
  adapt: '',
  short: 'min-h-[320px] sm:min-h-[380px]',
  medium: 'min-h-[420px] sm:min-h-[520px]',
  tall: 'min-h-[520px] sm:min-h-[680px]',
};

/**
 * The same heights from `sm` up only.
 *
 * With the copy BELOW the picture, a phone's slide is as tall as the picture
 * plus the words. Imposing a height there clips the headline and swallows the
 * buttons — the tallest thing on the slide ends up outside it.
 */
const HEIGHT_DESKTOP_ONLY: Record<string, string> = {
  adapt: '',
  short: 'sm:min-h-[380px]',
  medium: 'sm:min-h-[520px]',
  tall: 'sm:min-h-[680px]',
};

/**
 * The banner slideshow.
 *
 * One slide is not a slideshow: with a single banner this renders the slide
 * and nothing else — no controls, no timer, no live region. That is the case
 * every shop on the platform is in until its owner adds a second banner, so it
 * is the one that has to cost nothing.
 *
 * Three ways of moving, which is what the themes that have this actually ship:
 * `slide` walks a track sideways, `fade` cross-dissolves in place, `carousel`
 * walks a track that shows the next banner's edge. Zoom is not among them —
 * that is `imageMotion`, what the picture does while a slide is up, and it
 * combines with any of the three.
 *
 * Motion is a preference, not a decoration. Under `prefers-reduced-motion`
 * nothing advances on its own and nothing animates; the controls still work,
 * so every banner is still reachable.
 */
export function HeroSlideshow({ slides, settings }: Props) {
  const count = slides.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const region = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReducedMotion(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  const go = useCallback(
    (next: number) => {
      if (count === 0) return;
      // Without looping the ends are walls; with it, the track wraps. Either
      // way the index stays inside the list, so nothing renders blank.
      if (settings.loop) setIndex(((next % count) + count) % count);
      else setIndex(Math.min(Math.max(next, 0), count - 1));
    },
    [count, settings.loop],
  );

  const interval = INTERVAL_MS[settings.interval] ?? INTERVAL_MS.normal;
  const autoplay = count > 1 && interval > 0 && !reducedMotion && !paused;

  useEffect(() => {
    if (!autoplay) return;
    const timer = window.setTimeout(() => go(index + 1), interval);
    return () => window.clearTimeout(timer);
  }, [autoplay, index, interval, go]);

  // A phone has no arrow keys and, in the `below` layout, no arrows either.
  // Dragging the banner is how everyone expects to move it.
  const touchX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const from = touchX.current;
    touchX.current = null;
    if (from === null) return;
    const moved = (e.changedTouches[0]?.clientX ?? from) - from;
    // Far enough to be a swipe rather than a tap that wandered.
    if (Math.abs(moved) < 48) return;
    go(moved < 0 ? index + 1 : index - 1);
  };

  // Arrow keys move the slideshow only while it has focus, so they do not
  // fight the page's own scrolling.
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowRight') { event.preventDefault(); go(index + 1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); go(index - 1); }
  };

  // A slide whose copy sits under its picture on a phone has no fixed height
  // there; it is as tall as what is in it.
  const heights = settings.mobileText === 'below' ? HEIGHT_DESKTOP_ONLY : HEIGHT;
  const height = heights[settings.height] ?? heights.adapt;

  // A shop with one banner gets a banner, not a carousel.
  if (count <= 1) {
    return (
      <section className={`relative flex ${height}`}>
        {slides[0] && (
          <HeroSlideView
            slide={slides[0]}
            layout={settings.layout}
            mobileText={settings.mobileText}
            imageMotion={settings.imageMotion}
            priority
          />
        )}
      </section>
    );
  }

  // Which style draws the band. Each is its own module with its own
  // stylesheet, in its own chunk — a shop on a plain cross-fade never sends
  // its visitors the carousel's CSS or the deck's transforms. Everything
  // around it is the same whatever the animation, which is why the timer, the
  // swipe, the arrows and the indicator live here and not in six copies.
  const Stage = bannerStyle(settings.transition);

  return (
    <section
      ref={region}
      aria-roledescription="carousel"
      aria-label="Promotions"
      tabIndex={-1}
      onKeyDown={onKeyDown}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      // Pausing under a pointer is the answer to the one complaint every
      // slideshow gets. Focus counts too: someone tabbing through the buttons
      // on a banner must not have it move out from under them.
      onMouseEnter={() => settings.pauseOnHover && setPaused(true)}
      onMouseLeave={() => settings.pauseOnHover && setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      className={`relative isolate overflow-hidden bg-primary-solid ${height}`}
    >
      <Stage
        slides={slides}
        index={index}
        reducedMotion={reducedMotion}
        heightClass={height}
        renderSlide={(slide, i) => (
          <HeroSlideView
            slide={slide}
            layout={settings.layout}
            mobileText={settings.mobileText}
            imageMotion={settings.imageMotion}
            priority={i === 0}
          />
        )}
      />

      {settings.arrows && (
        <>
          {/* With the copy under the picture, the middle of the slide is the
              seam between them, so an arrow centred on it sits half over each.
              It hides on a phone there and the swipe takes over. */}
          <Control side="left" onClick={() => go(index - 1)} disabled={!settings.loop && index === 0} hideOnPhone={settings.mobileText === 'below'} />
          <Control side="right" onClick={() => go(index + 1)} disabled={!settings.loop && index === count - 1} hideOnPhone={settings.mobileText === 'below'} />
        </>
      )}

      <Indicators
        kind={settings.indicator}
        index={index}
        slides={slides}
        intervalMs={interval}
        paused={!autoplay}
        onSelect={go}
      />

      {/* A shopper using a screen reader is told which banner is up, once it
          settles, rather than on every frame of the animation. */}
      <p className="sr-only" aria-live="polite">
        Banner {index + 1} of {count}
      </p>
    </section>
  );
}

function Control({
  side, onClick, disabled, hideOnPhone,
}: { side: 'left' | 'right'; onClick: () => void; disabled: boolean; hideOnPhone: boolean }) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={side === 'left' ? 'Previous banner' : 'Next banner'}
      className={`absolute top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/30 bg-black/30 p-2.5 text-white backdrop-blur-sm transition hover:bg-black/55 disabled:pointer-events-none disabled:opacity-0 ${
        hideOnPhone ? 'hidden sm:block' : ''
      } ${side === 'left' ? 'start-3 sm:start-5' : 'end-3 sm:end-5'}`}
    >
      <Icon size={20} />
    </button>
  );
}
