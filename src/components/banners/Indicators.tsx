import type { ResolvedSlide } from '@/lib/hero-slides';
import css from './indicators.module.css';

interface Props {
  kind: string;
  index: number;
  slides: ResolvedSlide[];
  /** How long each banner stays up, in ms. 0 when it does not move on its own. */
  intervalMs: number;
  /** Autoplay is held — under a pointer, or because motion is reduced. */
  paused: boolean;
  onSelect: (i: number) => void;
}

/**
 * Where the shopper is in the list.
 *
 * Its own module with its own stylesheet, like the transitions, so a shop
 * choosing a counter does not ship the thumbnail rail's rules.
 *
 * Every variant is a real answer to a different problem. Dots stop being
 * countable past about six, which is why the counter exists. Thumbnails only
 * help when the banners look different from each other. The bar is the only
 * one that also says how long is left, so it is the one to choose when the
 * shop rotates on its own and a shopper might want to wait.
 */
export function Indicators({
  kind, index, slides, intervalMs, paused, onSelect,
}: Props) {
  const count = slides.length;
  if (kind === 'none' || count < 2) return null;

  if (kind === 'counter') {
    return (
      <div className={css.row}>
        <span className={css.counter}>
          {index + 1} / {count}
        </span>
      </div>
    );
  }

  if (kind === 'bar') {
    return (
      <div className={`${css.row} ${css.barRow}`}>
        {slides.map((slide, i) => {
          // Filled behind, running on the current one, empty ahead — and with
          // no timer, a plain full track, because there is nothing to count.
          const state =
            intervalMs === 0
              ? css.barStatic
              : i < index
                ? css.barDone
                : i > index
                  ? css.barWaiting
                  : `${css.barRunning} ${paused ? css.barPaused : ''}`;
          return (
            <button
              key={slide.id}
              type="button"
              onClick={() => onSelect(i)}
              aria-label={`Banner ${i + 1}`}
              aria-current={i === index}
              className={`${css.tap} ${css.barSegment} ${state}`}
            >
              <span
                className={css.barFill}
                // The shop's own interval: this is the number being shown, so
                // it cannot be a constant here.
                style={
                  i === index && intervalMs > 0
                    ? { animationDuration: `${intervalMs}ms` }
                    : undefined
                }
                // Restarting the animation when the banner changes needs the
                // element to be new, not restyled.
                key={`${slide.id}-${index}`}
              />
            </button>
          );
        })}
      </div>
    );
  }

  if (kind === 'thumbnails') {
    return (
      <div className={`${css.row} ${css.thumbRow}`}>
        {slides.map((slide, i) => (
          <button
            key={slide.id}
            type="button"
            onClick={() => onSelect(i)}
            aria-label={slide.title || `Banner ${i + 1}`}
            aria-current={i === index}
            className={`${css.tap} ${css.thumb} ${i === index ? css.thumbOn : ''}`}
          >
            {slide.imageUrl ? (
              // A plain img: these are tiny, already downloaded as the banner
              // behind them, and running eight of them through the image
              // pipeline to draw them at 52px would cost more than it saves.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={slide.imageUrl} alt="" loading="lazy" />
            ) : (
              <span className={css.thumbBlank} />
            )}
          </button>
        ))}
      </div>
    );
  }

  const shape =
    kind === 'pill'
      ? (on: boolean) => `${css.pill} ${on ? css.pillOn : ''}`
      : kind === 'lines'
        ? (on: boolean) => `${css.line} ${on ? css.lineOn : ''}`
        : kind === 'numbers'
          ? (on: boolean) => `${css.number} ${on ? css.numberOn : ''}`
          : (on: boolean) => `${css.dot} ${on ? css.dotOn : ''}`;

  return (
    <div className={css.row}>
      {slides.map((slide, i) => (
        <button
          key={slide.id}
          type="button"
          onClick={() => onSelect(i)}
          aria-label={`Banner ${i + 1}`}
          aria-current={i === index}
          className={`${css.tap} ${shape(i === index)}`}
        >
          {kind === 'numbers' ? i + 1 : <span className="sr-only">{i + 1}</span>}
        </button>
      ))}
    </div>
  );
}

/** Implemented here. A test compares this to what the server serves. */
export const IMPLEMENTED_INDICATORS = [
  'dots', 'pill', 'lines', 'bar', 'counter', 'numbers', 'thumbnails', 'none',
];
