import type { BannerStyleProps } from '../types';
import layer from './layered.module.css';
import css from './cover.module.css';

/**
 * The next banner slides over the top; the one underneath stays put.
 *
 * Unlike `slide`, where both move together and a strip of nothing passes
 * between them, this never shows a gap — which is what suits a fixed-height
 * band of pictures that reach the edges.
 */
export default function CoverStyle({
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
