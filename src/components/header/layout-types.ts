/**
 * What a header STYLE is handed, and what it is allowed to decide.
 *
 * A style is placement and nothing else. The parts below are built once by
 * StorefrontHeader and are byte-identical whichever style draws them, so a
 * new style cannot quietly ship a different cart button or a search box that
 * behaves unlike everybody else's.
 *
 * Colour, typeface, radius and spacing are NOT here on purpose. They come
 * from the theme tokens the parts already carry — a style that wanted its own
 * colour would be a shop that stops looking like itself the moment the
 * merchant picks a different header.
 */
import type { ReactNode } from 'react';

/** What a style may vary about how its menu is drawn. */
export interface MenuOptions {
  /**
   * Whether the way-out to the catalogue is drawn.
   *
   * Only ever added to the GENERATED menu, where it is the single route to
   * everything. A menu the merchant built gets exactly what they put in it.
   */
  showAll?: boolean;
  align?: 'start' | 'centre';
}

export interface HeaderParts {
  /** The shop's mark, linked home. Its logo, or its name as a wordmark. */
  brand: ReactNode;
  /**
   * The mark with the shop's tagline under it, as one lockup.
   *
   * Only for a layout with a row deep enough to carry it. Identical to
   * `brand` when the shop has not set a tagline, so a layout can use this
   * without checking — it is never a gap.
   */
  brandLockup: ReactNode;
  /** The search box or its icon, as this shop has configured it. Null if off. */
  search: ReactNode | null;
  /** The departments, drawn by whichever menu style the shop chose. */
  menu: (options?: MenuOptions) => ReactNode;
  /**
   * Where the chosen menu wants to be: a rail is a row under the bar, an
   * inline list and the two triggers are elements inside it.
   *
   * A style is free to overrule this — that is what a centred or stacked
   * mark does — but it has to know, because the two are not interchangeable:
   * a rail brings its own page gutter and rule, and a trigger does not.
   */
  menuPlacement: 'bar' | 'below';
  /** The menu ready to sit IN the bar, or null when it belongs under it. */
  menuInBar: ReactNode | null;
  /**
   * A button opening the WHOLE menu as a list, for a layout that wants an
   * index beside its departments.
   *
   * Not a replacement for the row: the row shows what a shop wants seen and
   * has only as much space as the bar allows, while this holds everything in
   * the order the merchant built it. A shopper who cannot find a department
   * in the row has somewhere to look that is not the search box.
   */
  menuIndex: ReactNode;
  /**
   * The menu ready to sit UNDER the bar, gutter and rule already applied
   * whichever kind it is. A style that wants a menu row drops this in and
   * does not wrap it.
   */
  menuBelow: ReactNode | null;
  /** True when there is nothing for a menu to draw — no menu row should exist. */
  menuEmpty: boolean;
  /** Each utility on its own, for a style that separates them. */
  utilities: {
    currency: ReactNode | null;
    location: ReactNode | null;
    language: ReactNode | null;
    account: ReactNode | null;
    wishlist: ReactNode | null;
    cart: ReactNode | null;
  };
  /** All of them in the conventional order — the common case. */
  utilityRow: ReactNode;
  /**
   * The same controls with their names under them.
   *
   * For a layout with the height to spend on it. An icon a shopper has to
   * recognise is a small tax on every visit, and a two-row header has the
   * room to stop charging it.
   */
  utilityRowLabelled: ReactNode;
  /** White type: the bar is dark, or it is sitting on a picture. */
  onDark: boolean;
  /** The bar has been asked to tighten, because the page is moving. */
  condensed: boolean;
  /** The page-width container every row shares, so rows line up with the page. */
  container: string;
  /** The bar's height, which `condense` changes. */
  barHeight: string;
  /** A hairline in the shop's colours, or nothing. Styles use it between rows. */
  rule: string;
}

export type HeaderLayoutProps = HeaderParts;
