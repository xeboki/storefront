import type { BannerStyleProps } from '../types';
import layer from './layered.module.css';
import css from './zoom.module.css';

/**
 * The banner leaving recedes as the next one comes forward.
 *
 * Distinct from the picture's own `push` motion, which happens while a banner
 * is up and combines with any transition. This one is only the handover.
 */
export default function ZoomStyle({
  slides, index, reducedMotion, heightClass, renderSlide,
}: BannerStyleProps) {
  return (
    <div className={`${layer.stage} ${heightClass}`}>
      {slides.map((slide, i) => (
        <div
          key={slide.id}
          aria-hidden={i !== index}
          className={[
            layer.panel,
            i === index ? layer.current : layer.resting,
            css.panel,
            i === index ? css.current : css.resting,
          ].join(' ')}
        >
          {renderSlide(slide, i)}
        </div>
      ))}
    </div>
  );
}
