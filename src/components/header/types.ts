/**
 * What every menu style is handed.
 *
 * One tree, resolved once by StorefrontHeader. A style that built its own
 * would drift from the others the first time a merchant reordered something —
 * the same reason the API serves the list of style names rather than each app
 * keeping a copy.
 *
 * The tree replaced a flat list of departments plus a separate list of the
 * shop's own links. Two lists could not express what a menu is: a shop's
 * navigation has depth, it has entries that are not departments, and it has
 * an order somebody chose.
 */
export type { MenuNode } from '@/lib/navigation';

import type { MenuNode } from '@/lib/navigation';

export interface MenuStyleProps {
  /** The menu, top level first. Children are one and two levels down. */
  nodes: MenuNode[];
  /** Where "everything" lives, and what this shop's language calls it. */
  allHref: string;
  allLabel: string;
  /**
   * The header has asked for its second row back — `condense`, on the way
   * down the page. A style that lives in the bar has nothing to give back
   * and ignores it.
   */
  collapsed: boolean;
  /** The word on a trigger, in the shopper's language. */
  menuLabel: string;
  /**
   * Whether the entry names shout.
   *
   * A setting rather than a look, because it was hardcoded in two places and
   * disagreed with itself: the rail shouted and the inline menu did not.
   */
  linkCase: 'normal' | 'upper';
  /** White type, because the bar is dark or sitting on a picture. */
  onDark: boolean;
  /**
   * Where the entries sit in their row, under a centred mark.
   *
   * `safe centre` rather than centre: a row long enough to overflow, centred,
   * pushes its first item off the left edge with no way to scroll back to it,
   * because scrolling cannot go negative. `safe` falls back to the start
   * exactly when that would happen.
   */
  align: 'start' | 'centre';
  /**
   * Whether this menu draws the way out to the whole catalogue.
   *
   * False for the second half of a split menu, which is the same menu drawn
   * twice — one escape hatch, not two, and it belongs on the half the eye
   * reaches first.
   */
  showAll: boolean;
}

/**
 * Where in the header a style is drawn.
 *
 * `below` is a row of its own under the bar; `bar` is an element inside it.
 * The header has to know before it renders — a style cannot be two places —
 * so it is declared beside the import rather than discovered from the output.
 */
export type MenuPlacement = 'bar' | 'below';
