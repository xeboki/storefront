/**
 * What every menu style is handed.
 *
 * The header resolves the departments once — filtering, ordering and the
 * links that go with them — and each style decides only how to draw them.
 * A style that computed its own list would drift from the others the first
 * time a merchant hid a department.
 */
export interface MenuEntry {
  id: string;
  label: string;
  href: string;
  /** How many products sit in it. 0 when the shop does not count. */
  count: number;
  /** The department's own colour from the till, if it has one. */
  colour: string | null;
}

export interface MenuLink {
  label: string;
  url: string;
  /** A shop's own link goes out through <a>; ours routes through <Link>. */
  external: boolean;
}

export interface MenuStyleProps {
  entries: MenuEntry[];
  /** Where "everything" lives, and what this shop's language calls it. */
  allHref: string;
  allLabel: string;
  links: MenuLink[];
  /**
   * The header has asked for its second row back — `condense`, on the way
   * down the page. A style that lives in the bar has nothing to give back
   * and ignores it.
   */
  collapsed: boolean;
  /** The word on a trigger, in the shopper's language. */
  menuLabel: string;
  /**
   * Whether the department names shout.
   *
   * A setting rather than a look, because it was hardcoded in two places and
   * disagreed with itself: the rail shouted and the inline menu did not.
   */
  linkCase: 'normal' | 'upper';
  /** White type, because the bar is dark or sitting on a picture. */
  onDark: boolean;
}

/**
 * Where in the header a style is drawn.
 *
 * `below` is a row of its own under the bar; `bar` is an element inside it.
 * The header has to know before it renders — a style cannot be two places —
 * so it is declared beside the import rather than discovered from the output.
 */
export type MenuPlacement = 'bar' | 'below';
