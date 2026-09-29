/**
 * The shop's menu: a tree the merchant owns, turned into things to click.
 *
 * The menu used to BE the department list. That could not be a shop's
 * navigation for three reasons, all of which showed up the moment a header
 * wanted a second level: departments are a till concept (how staff group
 * products on the sale screen, named for staff), they are flat, so there is
 * nothing to hang a submenu off and nothing to title a column with, and a
 * shop window needs entries that are not departments at all — a sale page, a
 * journal, an outside link, a heading that is not a link.
 *
 * So the merchant builds a tree, and this turns each entry's `target` into an
 * address. The address is resolved HERE and never stored: this file is the
 * only thing that knows the storefront's routes, and a URL saved in a menu
 * would rot the first time one of them changed.
 */
import type { MenuItem, OrderingCategory, StorefrontConfig } from '@xeboki/sdk';

export interface MenuNode {
  id: string;
  label: string;
  /** Null for a heading — a label with nowhere to go. */
  href: string | null;
  /** True when the address leaves this shop. */
  external: boolean;
  badge: string;
  imageUrl: string;
  /** How this node's children are laid out in a panel. See the SDK. */
  display: string;
  children: MenuNode[];
}

interface Context {
  storeSlug: string;
  categories: OrderingCategory[];
  /** Builds a catalogue address, carrying the shopper's filters across. */
  catalogHref: (categoryId: string | null) => string;
  /** This shop takes bookings. */
  hasBooking: boolean;
  /** This shop takes repairs in. */
  hasRepairs: boolean;
  labels: { allProducts: string; book: string; repairs: string; account: string };
}

/** Where each kind of entry goes. `null` means it is a label and nothing more. */
function addressOf(item: MenuItem, ctx: Context): { href: string | null; external: boolean } {
  const shop = `/${ctx.storeSlug}`;
  switch (item.target) {
    case 'catalog':  return { href: ctx.catalogHref(null), external: false };
    case 'category': return { href: ctx.catalogHref(item.value), external: false };
    case 'product':  return { href: `${shop}/product/${item.value}`, external: false };
    case 'page':     return { href: `${shop}/page/${item.value}`, external: false };
    case 'blog':     return { href: `${shop}/blog`, external: false };
    case 'book':     return { href: `${shop}/book`, external: false };
    case 'repairs':  return { href: `${shop}/repairs`, external: false };
    case 'account':  return { href: `${shop}/account`, external: false };
    case 'url':
      // A shop's own address written out in full is still its own address;
      // sending it through <a> would drop the router and reload the page.
      return { href: item.value, external: /^https?:\/\//i.test(item.value) };
    default:         return { href: null, external: false };
  }
}

function toNode(item: MenuItem, ctx: Context, depth: number): MenuNode[] {
  // "All my departments, live." The one entry that is not a link but a
  // promise: a department added at the till turns up here without anybody
  // editing a menu, which is the failure every hand-built menu eventually
  // has. A merchant can curate the front of their menu and leave this at the
  // back of it.
  if (item.target === 'categories') {
    return ctx.categories.map((c: OrderingCategory) => ({
      id: `cat-${c.id}`,
      label: c.name,
      href: ctx.catalogHref(c.id),
      external: false,
      badge: '',
      imageUrl: '',
      display: 'auto',
      children: [],
    }));
  }

  const { href, external } = addressOf(item, ctx);
  return [{
    id: item.id,
    label: item.label,
    href,
    external,
    badge: item.badge,
    imageUrl: item.imageUrl,
    display: item.display,
    children: depth >= 3 ? [] : item.children.flatMap((c) => toNode(c, ctx, depth + 1)),
  }];
}

/**
 * What this shop has always shown, expressed as a menu.
 *
 * A shop that has never built one must not lose its navigation, and every
 * shop predates this. So the departments and the shop's built-in pages are
 * assembled into the same shape a built menu has — which also means the back
 * office can offer "start from my departments" and write exactly this.
 */
function generated(ctx: Context, navLinks: { label: string; url: string }[]): MenuNode[] {
  const nodes: MenuNode[] = [{
    id: 'all', label: ctx.labels.allProducts, href: ctx.catalogHref(null),
    external: false, badge: '', imageUrl: '', display: 'auto', children: [],
  }];
  for (const c of ctx.categories) {
    nodes.push({
      id: `cat-${c.id}`, label: c.name, href: ctx.catalogHref(c.id),
      external: false, badge: '', imageUrl: '', display: 'auto', children: [],
    });
  }
  if (ctx.hasBooking) {
    nodes.push({ id: 'book', label: ctx.labels.book, href: `/${ctx.storeSlug}/book`,
                 external: false, badge: '', imageUrl: '', display: 'auto', children: [] });
  }
  if (ctx.hasRepairs) {
    nodes.push({ id: 'repairs', label: ctx.labels.repairs, href: `/${ctx.storeSlug}/repairs`,
                 external: false, badge: '', imageUrl: '', display: 'auto', children: [] });
  }
  for (const link of navLinks) {
    nodes.push({
      id: link.url, label: link.label, href: link.url,
      external: /^https?:\/\//i.test(link.url), badge: '', imageUrl: '',
      display: 'auto', children: [],
    });
  }
  return nodes;
}

export interface ResolvedMenu {
  nodes: MenuNode[];
  /**
   * True when this is the list assembled from the departments rather than one
   * the merchant built.
   *
   * It decides whether the header adds its own way-out to the catalogue. That
   * link belongs to the GENERATED menu, where it is the only route to
   * everything — in a built menu it is an entry the merchant never added,
   * cannot reorder and cannot remove, sitting in front of the ones they did.
   * A merchant who wants it adds an "All products" entry, which is one of the
   * kinds the editor offers.
   */
  generated: boolean;
}

export function resolveMenu(
  config: StorefrontConfig | null,
  ctx: Context,
): ResolvedMenu {
  const built = config?.navigation?.main ?? [];
  if (built.length > 0) {
    return { nodes: built.flatMap((item) => toNode(item, ctx, 1)), generated: false };
  }
  return { nodes: generated(ctx, config?.navLinks ?? []), generated: true };
}

/** Whether this menu has a second level anywhere — a mega panel needs one. */
export function hasChildren(nodes: MenuNode[]): boolean {
  return nodes.some((n) => n.children.length > 0);
}
