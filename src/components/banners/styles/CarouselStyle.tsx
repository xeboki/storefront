import type { BannerStyleProps } from '../types';
import css from './carousel.module.css';

/**
 * Banners walk sideways with the next one's edge showing.
 *
 * The 6% offset centres the current card and leaves the neighbours visible. At
 * the first and last banner one side shows the band's own colour — that is how
 * a carousel looks, and pinning it flush at the ends makes the card jump.
 */
export default function CarouselStyle({
  slides, index, reducedMotion, heightClass, renderSlide,
}: BannerStyleProps) {
  return (
    <div className={css.viewport}>
      <div
        className={`${css.track} ${reducedMotion ? '' : css.animated}`}
        style={{ transform: `translate3d(calc(-${index} * 88% + 6%), 0, 0)` }}
      >
        {slides.map((slide, i) => (
          <div
            key={slide.id}
            aria-hidden={i !== index}
            className={`${css.panel} ${i === index ? '' : css.resting} ${heightClass}`}
          >
            <div className={css.card}>{renderSlide(slide, i)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
