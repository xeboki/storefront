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

/** A slice of the departments, for a style that splits them around a mark. */
export interface MenuSlice {
  from?: number;
  to?: number;
  /** One escape hatch per header, so the second half of a split asks for none. */
  showAll?: boolean;
  align?: 'start' | 'centre';
}

export interface HeaderParts {
  /** The shop's mark, linked home. Its logo, or its name as a wordmark. */
  brand: ReactNode;
  /** The search box or its icon, as this shop has configured it. Null if off. */
  search: ReactNode | null;
  /**
   * The departments, drawn by whichever menu style the shop chose.
   * Call with a slice to draw part of them — for a style that cuts the list
   * in half around a centred mark.
   */
  menu: (slice?: MenuSlice) => ReactNode;
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
   * The menu ready to sit UNDER the bar, gutter and rule already applied
   * whichever kind it is. A style that wants a menu row drops this in and
   * does not wrap it.
   */
  menuBelow: ReactNode | null;
  /** True when there is nothing for a menu to draw — no menu row should exist. */
  menuEmpty: boolean;
  /** How many departments there are, for a style that cuts them in half. */
  departments: number;
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
