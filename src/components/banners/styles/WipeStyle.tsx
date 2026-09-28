import type { BannerStyleProps } from '../types';
import layer from './layered.module.css';
import css from './wipe.module.css';

/**
 * The next banner is uncovered across the frame.
 *
 * Which side a banner is hidden on is measured against the current one, so
 * going back reverses the wipe rather than repeating it — the movement tells
 * the shopper which way through the list they are going.
 */
export default function WipeStyle({
  slides, index, reducedMotion, heightClass, renderSlide,
}: BannerStyleProps) {
  return (
    <div className={`${layer.stage} overflow-hidden ${heightClass}`}>
      {slides.map((slide, i) => (
        <div
          key={slide.id}
          aria-hidden={i !== index}
          className={[
            layer.panel,
            i === index ? layer.current : layer.resting,
            reducedMotion ? '' : css.panel,
            i === index ? css.current : i < index ? css.before : css.after,
          ].join(' ')}
        >
          {renderSlide(slide, i)}
        </div>
      ))}
    </div>
  );
}
