/**
 * The header styles this storefront can draw, by the name the API serves.
 *
 * One entry per name in `_HEADER_STYLES`. A name the API offers and this file
 * does not have is a merchant choosing a header and watching nothing change,
 * which is what `test_header_styles_are_implemented.py` fails on.
 *
 * Each is a dynamic import, so a shop downloads the one header it uses rather
 * than all of them. That matters more here than anywhere else in the app: the
 * header is on every page, and this list is meant to keep growing.
 */
import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';
import type { HeaderLayoutProps } from '../layout-types';

interface Style {
  Component: ComponentType<HeaderLayoutProps>;
  /**
   * Whether the mark sits in the middle of the bar.
   *
   * The menu has to know before either is drawn: a centred mark leaves no
   * room beside it, so the departments go under the bar whatever the menu
   * would have preferred.
   */
  centred: boolean;
  /**
   * Which row the departments go in.
   *
   *   'menu'  — whatever the chosen menu wanted. A rail becomes a row, an
   *             inline list stays in the bar. Only a style with room for
   *             either can say this.
   *   'below' — always a row of its own, whatever the menu wanted. A centred
   *             or stacked mark leaves no room beside it.
   *   'bar'   — always inside the bar. A style with a single row has nowhere
   *             else to put them, so a menu that wanted a row of its own is
   *             swapped for the in-bar one rather than drawn full width
   *             inside a column a third of the page wide.
   *   'own'   — the style places the departments itself, in slices. Needs a
   *             menu that puts them in the bar AND can stop when it runs out
   *             of room; anything else falls back to the centred style,
   *             because half a menu around a mark is worse than the nearest
   *             arrangement that exists.
   */
  menuRow: 'menu' | 'below' | 'bar' | 'own';
}

export const HEADER_STYLES: Record<string, Style> = {
  classic: { centred: false, menuRow: 'menu',  Component: dynamic(() => import('./ClassicHeader')) },
  centred: { centred: true,  menuRow: 'below', Component: dynamic(() => import('./CentredHeader')) },
  stacked: { centred: false, menuRow: 'below', Component: dynamic(() => import('./StackedHeader')) },
  split:   { centred: true,  menuRow: 'own',   Component: dynamic(() => import('./SplitHeader')) },
  // The departments are centred here, but the MARK is not — `centred` is
  // about the mark, and it is what tells the menu to centre its own row when
  // it has one. This style has no second row, so it says false and centres
  // the menu itself.
  centred_menu: { centred: false, menuRow: 'bar', Component: dynamic(() => import('./CentredMenuHeader')) },
};

/** What the API falls back to, and so must this. */
export const DEFAULT_STYLE = 'classic';

export function headerStyle(name: string | null | undefined): Style {
  return HEADER_STYLES[name ?? ''] ?? HEADER_STYLES[DEFAULT_STYLE];
}
