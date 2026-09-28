import type { BannerStyleProps } from '../types';
import layer from './layered.module.css';
import css from './vertical.module.css';

/**
 * Banners walk upward instead of sideways.
 *
 * Which side a banner waits on is measured against the current one, so the
 * movement always reads the same direction however the shopper got here —
 * clicking dot 1 from dot 3 still sends banner 3 up and out, rather than
 * dragging the whole list back down.
 */
export default function VerticalStyle({
  slides, index, reducedMotion, heightClass, renderSlide,
}: BannerStyleProps) {
  return (
    <div className={`${layer.stage} overflow-hidden ${heightClass || 'min-h-[420px]'}`}>
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
