import type { BannerStyleProps } from '../types';
import layer from './layered.module.css';
import css from './fade.module.css';

/** Banners cross-dissolve in place. */
export default function FadeStyle({
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
            reducedMotion ? '' : css.panel,
            i === index ? css.current : css.resting,
          ].join(' ')}
        >
          {renderSlide(slide, i)}
        </div>
      ))}
    </div>
  );
}
