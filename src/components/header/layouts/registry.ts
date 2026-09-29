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
   *
   * `below` and `bar` are both in the vocabulary because a style that has a
   * second row and one that does not are the two shapes every header takes;
   * only `bar` is in use today.
   */
  menuRow: 'menu' | 'below' | 'bar';
  /**
   * Whether the bar carries only the three controls a shopper reaches for.
   *
   * A layout that centres something needs its two sides to weigh the same,
   * and a store picker with a town name in it is what makes that impossible:
   * the mark is ~150px and the full control set is ~400px, so "centred" lands
   * half the difference off and the side that lost gets squeezed to nothing.
   * These layouts keep account, saved and cart, and drop the three that
   * describe the shop rather than serve the shopper — the same call the
   * search overlay makes, for the same reason.
   */
  spare: boolean;
}

export const HEADER_STYLES: Record<string, Style> = {
  // What the storefront drew before styles existed, and what every shop that
  // has never chosen one still gets. Not a design anybody picked — it is the
  // floor, and it stays whatever else is added above it.
  classic: { centred: false, menuRow: 'menu', spare: false, Component: dynamic(() => import('./ClassicHeader')) },
  // The departments are centred here, but the MARK is not — `centred` is
  // about the mark, and it is what tells a menu to centre its own row when
  // it has one. This style has no second row, so it says false and centres
  // the menu itself.
  centred_menu: { centred: false, menuRow: 'bar', spare: true, Component: dynamic(() => import('./CentredMenuHeader')) },
};

/** What the API falls back to, and so must this. */
export const DEFAULT_STYLE = 'classic';

export function headerStyle(name: string | null | undefined): Style {
  return HEADER_STYLES[name ?? ''] ?? HEADER_STYLES[DEFAULT_STYLE];
}
