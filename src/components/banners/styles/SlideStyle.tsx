import type { BannerStyleProps } from '../types';
import css from './track.module.css';

/**
 * Banners walk sideways, one at a time.
 *
 * The one every theme has, and the fallback for a name this storefront does
 * not implement: whatever else is wrong, a shop's first band still works.
 */
export default function SlideStyle({
  slides, index, reducedMotion, heightClass, renderSlide,
}: BannerStyleProps) {
  return (
    <div
      className={`${css.track} ${reducedMotion ? '' : css.animated}`}
      style={{ transform: `translate3d(-${index * 100}%, 0, 0)` }}
    >
      {slides.map((slide, i) => (
        <div
          key={slide.id}
          aria-hidden={i !== index}
          className={`${css.panel} ${heightClass}`}
        >
          {renderSlide(slide, i)}
        </div>
      ))}
    </div>
  );
}
