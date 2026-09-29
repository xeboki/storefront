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
   * Whether the departments are centred in the space they are given.
   *
   * Named for what it does, not for where the mark is — those are separate,
   * and a style can have a centred mark with a left-aligned menu beside it.
   * The menu has to be told, because only it knows how to centre a row that
   * might be too long to centre safely.
   */
  centreMenu: boolean;
  /**
   * Which row the departments go in.
   *
   *   'below' — a row of its own, whatever the menu wanted. For a style
   *             whose bar has no room beside the mark.
   *   'bar'   — always inside the bar. A style with a single row has nowhere
   *             else to put them, so a menu that wanted a row of its own is
   *             swapped for the in-bar one rather than drawn full width
   *             inside a column a third of the page wide.
   *
   * Both stay in the vocabulary because a header with a second row and one
   * without are the two shapes there are; only `bar` is in use today.
   */
  menuRow: 'below' | 'bar';
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
  /**
   * A menu this style requires, overriding the shop's choice.
   *
   * Only for a bar that has nowhere to put anything else. A header whose
   * navigation is a single button cannot draw a rail or a row of
   * departments — the button IS the menu — so offering the merchant four
   * menus here would be three that cannot be honoured.
   */
  forceMenu?: string;
}

export const HEADER_STYLES: Record<string, Style> = {
  // This one centres the departments with CSS rather than through
  // `centreMenu`, because the centring is the grid's job here: the menu sits
  // in a middle column with equal columns either side of it.
  centred_menu: { centreMenu: false, menuRow: 'bar', spare: true, Component: dynamic(() => import('./CentredMenuHeader')) },
  // The bar is a button, a mark and the icons. Everything else is behind the
  // button, which is why this one names its menu.
  burger: {
    // Nothing to align: the menu is one button.
    centreMenu: false, menuRow: 'bar', spare: true, forceMenu: 'drawer',
    Component: dynamic(() => import('./BurgerHeader')),
  },
  // Departments left, mark centred, everything else right. The only centred
  // arrangement that keeps the wide controls — a language switcher and a
  // currency — because the run of departments on the left balances them.
  centred_mark: {
    centreMenu: false, menuRow: 'bar', spare: false,
    Component: dynamic(() => import('./CentredMarkHeader')),
  },
  // Two rows: the lockup centred above, the departments below. The deepest
  // header there is, and the only one with the height to carry a tagline and
  // to name its icons rather than expecting them to be recognised.
  lockup: {
    centreMenu: false, menuRow: 'below', spare: false,
    Component: dynamic(() => import('./LockupHeader')),
  },
  // The same two rows with the weight moved: the mark anchors the left edge
  // and the middle goes to search. `centreMenu` is true here because the
  // departments centre under it — the only style so far that uses it.
  centred_search: {
    centreMenu: true, menuRow: 'below', spare: false,
    Component: dynamic(() => import('./CentredSearchHeader')),
  },
};

/**
 * What the API falls back to, and so must this.
 *
 * A shop that has never chosen renders this one. It is not "the old header":
 * the arrangement that predated styles was removed with them, so an existing
 * shop moves to this the first time it is served.
 */
export const DEFAULT_STYLE = 'centred_menu';

export function headerStyle(name: string | null | undefined): Style {
  return HEADER_STYLES[name ?? ''] ?? HEADER_STYLES[DEFAULT_STYLE];
}
