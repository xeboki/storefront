'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { HeroSlideshow as Settings } from '@xeboki/sdk';
import type { ResolvedSlide } from '@/lib/hero-slides';
import { INTERVAL_MS } from '@/lib/hero-slides';
import { HeroSlideView } from './HeroSlideView';

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

  const fade = settings.transition === 'fade';
  const peek = settings.transition === 'carousel';
  const motion = reducedMotion ? '' : 'transition-transform duration-700 ease-out';

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
      {fade ? (
        <div className={`relative flex ${height}`}>
          {slides.map((slide, i) => (
            <div
              key={slide.id}
              aria-hidden={i !== index}
              // The slide on show is IN FLOW and the rest are stacked over it.
              //
              // Stacking all of them needs a definite height, and the `below`
              // layout deliberately has none on a phone — its height is the
              // picture plus the words. With every slide absolute the section
              // collapsed to nothing. This way the band is always exactly as
              // tall as what is in it, and the cross-fade still works because
              // the outgoing slide is the one that floats.
              //
              // The others stay in the tree so their images are already
              // decoded and a shopper never watches one load in.
              className={`flex w-full ${
                i === index ? 'relative z-10 opacity-100' : 'pointer-events-none absolute inset-0 opacity-0'
              } ${reducedMotion ? '' : 'transition-opacity duration-700 ease-out'}`}
            >
              <HeroSlideView
                slide={slide}
                layout={settings.layout}
                mobileText={settings.mobileText}
                imageMotion={settings.imageMotion}
                priority={i === 0}
              />
            </div>
          ))}
        </div>
      ) : (
        <div
          className={`flex ${motion}`}
          style={{
            transform: peek
              ? `translateX(calc(-${index} * 88% + 6%))`
              : `translateX(-${index * 100}%)`,
          }}
        >
          {slides.map((slide, i) => (
            <div
              key={slide.id}
              aria-hidden={i !== index}
              className={`flex ${peek ? 'w-[88%] shrink-0 px-1.5' : 'w-full shrink-0'} ${height}`}
            >
              <div className={`flex w-full ${peek ? 'overflow-hidden rounded-2xl' : ''}`}>
                <HeroSlideView
                  slide={slide}
                  layout={settings.layout}
                  mobileText={settings.mobileText}
                  imageMotion={settings.imageMotion}
                  priority={i === 0}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {settings.arrows && (
        <>
          {/* With the copy under the picture, the middle of the slide is the
              seam between them, so an arrow centred on it sits half over each.
              It hides on a phone there and the swipe takes over. */}
          <Control side="left" onClick={() => go(index - 1)} disabled={!settings.loop && index === 0} hideOnPhone={settings.mobileText === 'below'} />
          <Control side="right" onClick={() => go(index + 1)} disabled={!settings.loop && index === count - 1} hideOnPhone={settings.mobileText === 'below'} />
        </>
      )}

      <Indicator
        kind={settings.indicator}
        index={index}
        count={count}
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
      } ${side === 'left' ? 'left-3 sm:left-5' : 'right-3 sm:right-5'}`}
    >
      <Icon size={20} />
    </button>
  );
}

/**
 * Where the shopper is in the list.
 *
 * Shopify's three: dots, a "2 / 5" counter, and a numbered row. They are not
 * interchangeable — dots stop being readable past about six, which is why a
 * counter exists.
 */
function Indicator({
  kind, index, count, onSelect,
}: { kind: string; index: number; count: number; onSelect: (i: number) => void }) {
  if (kind === 'none') return null;

  if (kind === 'counter') {
    return (
      <div className="absolute bottom-5 left-1/2 z-20 -translate-x-1/2 rounded-full border border-white/25 bg-black/35 px-3.5 py-1.5 text-sm font-medium tabular-nums text-white backdrop-blur-sm">
        {index + 1} / {count}
      </div>
    );
  }

  return (
    <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onSelect(i)}
          aria-label={`Banner ${i + 1}`}
          aria-current={i === index}
          className={
            kind === 'numbers'
              ? `h-7 min-w-7 rounded-full px-2 text-xs font-semibold tabular-nums transition ${
                  i === index
                    ? 'bg-white text-slate-900'
                    : 'border border-white/35 text-white/80 hover:bg-white/15'
                }`
              : `h-2 rounded-full transition-all ${
                  i === index ? 'w-7 bg-white' : 'w-2 bg-white/45 hover:bg-white/70'
                }`
          }
        >
          {kind === 'numbers' ? i + 1 : <span className="sr-only">{i + 1}</span>}
        </button>
      ))}
    </div>
  );
}
