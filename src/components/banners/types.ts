import type { ReactNode } from 'react';
import type { ResolvedSlide } from '@/lib/hero-slides';

/**
 * What every banner style is given, and all it is allowed to care about.
 *
 * A style arranges banners and animates between them. It does NOT own the
 * timer, the swipe, the arrows, the indicator or which banner is current —
 * those are the same whatever the animation, and a copy of them in six files
 * is six places for the autoplay to stop pausing on hover.
 */
export interface BannerStyleProps {
  slides: ResolvedSlide[];
  /** Which banner is current. */
  index: number;
  /**
   * Honour this. Under `prefers-reduced-motion` a style must arrive at the
   * right banner with no animation rather than a faster one.
   */
  reducedMotion: boolean;
  /** The height classes for the band, or '' when it fits its content. */
  heightClass: string;
  /** Draws one banner. The style decides where it goes, not what is in it. */
  renderSlide: (slide: ResolvedSlide, i: number) => ReactNode;
}
