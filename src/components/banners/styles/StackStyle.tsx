import type { BannerStyleProps } from '../types';
import layer from './layered.module.css';
import css from './stack.module.css';

/**
 * The banners are a deck, and the top one lifts away.
 *
 * Depth is relative to the current banner and WRAPS, so the deck still has
 * cards behind it on the last banner — measured forward, the last one would
 * sit alone over an empty stage, which reads as the slideshow having broken.
 */
export default function StackStyle({
  slides, index, reducedMotion, heightClass, renderSlide,
}: BannerStyleProps) {
  const count = slides.length;

  const depthClass = (i: number) => {
    const ahead = (i - index + count) % count;
    if (ahead === 0) return css.current;
    if (ahead === 1) return css.behind1;
    if (ahead === 2) return css.behind2;
    // The one just passed is the one leaving; everything else waits unseen.
    return ahead === count - 1 ? css.leaving : css.hidden;
  };

  return (
    <div className={`${layer.stage} ${css.deck} ${heightClass || 'min-h-[420px]'}`}>
      {slides.map((slide, i) => (
        <div
          key={slide.id}
          aria-hidden={i !== index}
          className={[
            layer.panel,
            i === index ? layer.current : layer.resting,
            css.panel,
            depthClass(i),
          ].join(' ')}
        >
          {renderSlide(slide, i)}
        </div>
      ))}
    </div>
  );
}
