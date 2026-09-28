import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';
import type { BannerStyleProps } from './types';

/**
 * Every banner style, one module each.
 *
 * Each entry is its own component and its own stylesheet, loaded only by the
 * shops that chose it: `next/dynamic` puts each in its own chunk, so a shop
 * running a plain cross-fade never sends its visitors the carousel's CSS or
 * the deck's transforms.
 *
 * Adding a style is adding a file and a line here. Nothing in the slideshow
 * itself changes, because a style is only ever asked to arrange banners — the
 * timer, the swipe, the arrows and the indicator live above it and are the
 * same whatever the animation.
 *
 * The names are the server's: `/storefront-config` serves the catalogue that
 * the back office lists, and this is the half that knows how to draw them. A
 * name served but not implemented here falls back rather than rendering
 * nothing, which is the one thing a shop's first band must never do.
 */
const STYLES: Record<string, ComponentType<BannerStyleProps>> = {
  slide: dynamic(() => import('./styles/SlideStyle')),
  fade: dynamic(() => import('./styles/FadeStyle')),
  vertical: dynamic(() => import('./styles/VerticalStyle')),
  zoom: dynamic(() => import('./styles/ZoomStyle')),
  carousel: dynamic(() => import('./styles/CarouselStyle')),
  stack: dynamic(() => import('./styles/StackStyle')),
};

/** The style a shop asked for, or the one every shop can fall back to. */
export function bannerStyle(name: string): ComponentType<BannerStyleProps> {
  return STYLES[name] ?? STYLES.slide;
}

/** Implemented here. A test compares this to what the server serves. */
export const IMPLEMENTED_TRANSITIONS = Object.keys(STYLES);
