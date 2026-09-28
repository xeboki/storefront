'use client';

/**
 * The shop's header.
 *
 * Four things the merchant sets separately, resolved here and then drawn by
 * parts that each know about one of them:
 *
 *   · `menu`     — how the departments are presented (../header/registry)
 *   · `mobileMenu` — how they are presented on a phone (../header/MobileNav)
 *   · `scroll`   — what the bar does as the page moves under it
 *   · `surface`  — what it is made of
 *
 * plus the search axes and the visibility switches, which predate them.
 *
 * The departments are resolved once, here, and handed to whichever style is
 * drawing them. A style that filtered its own list would drift from the others
 * the first time a merchant hid one — which is the same reason the API serves
 * the list of style names rather than each app keeping a copy.
 */
import Link from 'next/link';
import { storeName } from '@/lib/store-name';
import { useCallback, useMemo, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { clsx } from 'clsx';
import { ShoppingCart, User, Heart } from 'lucide-react';
import { StorePicker } from './StorePicker';
import { LanguageSwitcher } from './LanguageSwitcher';
import { HeaderSearch } from './HeaderSearch';
import { HeaderSearchSlot } from './HeaderSearchSlot';
import { MobileTabBar } from './MobileTabBar';
import { StoreLogo } from './StoreLogo';
import { menuStyle } from '../header/registry';
import { MobileNav, asMobileMenu } from '../header/MobileNav';
import {
  asLinkCase, asLogoPosition, asScroll, asSurface, useOverBanner,
  OVER_BANNER_SURFACES,
} from '../header/chrome';
import type { LogoPosition, Scroll } from '../header/chrome';
import type { MenuEntry, MenuLink } from '../header/types';
import { useHydrated } from '@/lib/use-hydrated';
import { useScrollDirection } from '@/lib/use-scroll-direction';
import { useCartStore } from '@/stores/cartStore';
import { useAuthStore } from '@/stores/authStore';
import { useStoreConfigStore } from '@/stores/storeConfigStore';
import { hasAppointments, hasWorkOrders } from '@/lib/business-type';
import { useT } from '@/lib/i18n/client';
import type {
  StoreConfig, StorefrontConfig, NavLink, FulfillmentLocation, OrderingCategory,
} from '@xeboki/sdk';

/**
 * Where each scroll behaviour puts the bar.
 *
 * Every value named, including the three that share an answer. `fixed` used
 * to be drawn by not being one of the others, which is correct and unreadable:
 * nothing in the file said it was a choice the header supports, so the next
 * person to add a fifth would have had no reason to think about it.
 */
const SCROLL_POSITION: Record<Scroll, string> = {
  'fixed':    'sticky top-0',
  'condense': 'sticky top-0',
  'hide':     'sticky top-0',
  'static':   'relative',
};

/**
 * Which row the menu is drawn in, once the mark has had its say.
 *
 * A style declares where it wants to be, but a centred or stacked mark takes
 * the bar for itself — there is no room beside a mark in the middle of the
 * row, and putting one there is what "centred" means the shop does not want.
 * `'style'` means the style's own choice stands.
 *
 * Every position named, including the two that share an answer: `stacked`
 * used to be drawn by not being one of the others, which is correct and
 * unreadable, and is the same shape as the `fixed` scroll value below.
 */
const MENU_ROW: Record<LogoPosition, 'style' | 'below' | 'split'> = {
  'left':    'style',
  'stacked': 'below',
  'centred': 'below',
  'split':   'split',
};

interface Props {
  storeConfig: StoreConfig;
  storefrontConfig: StorefrontConfig | null;
  storeSlug: string;
  /** Branches to choose between. Empty unless the shop browses store-first. */
  stores: FulfillmentLocation[];
  activeLocationId: string | null;
  /** Every active department. What reaches a menu is filtered below. */
  categories: OrderingCategory[];
  locales: string[];
  locale: string;
}

export function StorefrontHeader({
  storeConfig, storefrontConfig, storeSlug, stores, activeLocationId,
  categories, locales, locale,
}: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = useCallback(() => setMobileOpen(false), []);
  // The cart lives in localStorage, so the server cannot know it. Showing the
  // badge before hydration made React discard the header's markup.
  const hydrated = useHydrated();
  const itemCount = useCartStore((s) => s.itemCount());
  const customer = useAuthStore((s) => s.customer);
  const businessType = useStoreConfigStore((s) => s.businessType);
  const t = useT();
  const { hidden: goingDown, scrolled } = useScrollDirection();

  const showBooking = hasAppointments(businessType);
  const showTracking = hasWorkOrders(businessType);
  const customNavLinks: NavLink[] = storefrontConfig?.navLinks ?? [];

  // How this shop wants its header. The API fills every field and falls back
  // on anything it does not recognise, so nothing here has to be defended
  // against a half-written setting — but the resolvers are here anyway,
  // because this component also renders for a shop the API never answered for.
  const header = storefrontConfig?.headerSettings;
  const searchOn = (header?.search ?? 'on') !== 'off';
  const railStyle = header?.categoryRail ?? 'all';
  const scroll = asScroll(header?.scroll);
  const surface = asSurface(header?.surface);
  const linkCase = asLinkCase(header?.linkCase);
  const { placement, elastic, Component: Menu } = menuStyle(header?.menu);

  const params = useSearchParams();
  const pathname = usePathname();

  // Carry the catalog's own state across a department change — the search
  // term, the sort and the chosen store — so picking "Clothing" does not
  // silently throw away what the shopper had narrowed to. Only these four:
  // the header is on every page, and a stray param from an order page does
  // not belong on a catalog link.
  const catalogHref = useCallback(
    (categoryId: string | null) => {
      const next = new URLSearchParams();
      for (const key of ['q', 'sort', 'instock', 'loc']) {
        const value = params.get(key);
        if (value) next.set(key, value);
      }
      if (categoryId) next.set('category', categoryId);
      const qs = next.toString();
      return `/${storeSlug}/catalog${qs ? `?${qs}` : ''}`;
    },
    [params, storeSlug],
  );

  const hiddenCategories = useMemo(
    () => new Set(header?.hiddenCategoryIds ?? []),
    [header?.hiddenCategoryIds],
  );
  const featuredIds = useMemo(
    () => storefrontConfig?.featuredCategoryIds ?? [],
    [storefrontConfig?.featuredCategoryIds],
  );

  const entries: MenuEntry[] = useMemo(
    () =>
      categories
        .filter((c) => c.id !== '_uncategorized')
        .filter((c) => !hiddenCategories.has(c.id))
        // 'featured' shows the merchant's chosen set, in the order they
        // arranged it — but only once they have chosen one. A shop that
        // picked nothing would otherwise get an empty menu where its
        // departments were.
        .filter((c) => railStyle !== 'featured' || featuredIds.length === 0 || featuredIds.includes(c.id))
        .sort((a, b) =>
          railStyle === 'featured' && featuredIds.length
            ? featuredIds.indexOf(a.id) - featuredIds.indexOf(b.id)
            : 0)
        .map((c) => ({
          id: c.id,
          label: c.name,
          href: catalogHref(c.id),
          count: c.productCount ?? 0,
          colour: c.color,
        })),
    [categories, hiddenCategories, railStyle, featuredIds, catalogHref],
  );

  const links: MenuLink[] = useMemo(() => {
    const out: MenuLink[] = [];
    if (showBooking) out.push({ label: 'Book', url: `/${storeSlug}/book`, external: false });
    if (showTracking) out.push({ label: 'Track Order', url: `/${storeSlug}/repairs`, external: false });
    for (const link of customNavLinks) out.push({ label: link.label, url: link.url, external: true });
    return out;
  }, [showBooking, showTracking, customNavLinks, storeSlug]);

  // `transparent` and `gradient` only mean anything over a picture, and the
  // only page with one is the shop's front. Everywhere else they start solid,
  // so a header never sits on the page background with nothing behind its
  // type. `inverse` is not tied to a banner — it is the same dark bar on
  // every page, which is the point of it.
  const canBeTransparent =
    OVER_BANNER_SURFACES.includes(surface) &&
    pathname === `/${storeSlug}` &&
    (storefrontConfig?.heroSlides?.length ?? 0) > 0;
  const overBanner = useOverBanner(canBeTransparent);
  /** White type: the bar is dark, or it is sitting on a photograph. */
  const onDark = overBanner || surface === 'inverse';

  /**
   * Where the mark sits, and what the menu does around it.
   *
   * `split` puts the departments either side of a centred mark, so it needs a
   * menu that puts them IN the bar and can stop when it runs out of room —
   * which is the inline one, and only that one. A mega or drawer menu is a
   * single trigger with nothing to split. A rail is a row under the bar, and
   * a rail split in half around a mark above it is two scrolling strips with
   * two sets of arrows, which is what it looked like.
   *
   * So anything else falls back to a centred mark with the menu under it:
   * the nearest arrangement that exists, rather than a header with a gap
   * where half a menu should be. The back office says so beside the name, so
   * a merchant is not left to discover it.
   */
  const asked = asLogoPosition(header?.logoPosition);
  const logoAt = asked === 'split' && !elastic ? 'centred' : asked;
  const markCentred = logoAt === 'centred' || logoAt === 'split';

  const menuHasNothingToShow = railStyle === 'off' || (entries.length === 0 && links.length === 0);

  /**
   * Which row the menu is drawn in, once the mark has had its say.
   *
   * A style declares where it wants to be, but a centred or stacked mark
   * takes the bar for itself — there is no room beside a mark in the middle
   * of the row, and putting one there is what "centred" means the shop does
   * not want.
   */
  const row = MENU_ROW[logoAt];
  const menuRow: 'bar' | 'below' | 'split' = row === 'style' ? placement : row;

  /**
   * "Fills the bar" needs a bar to fill.
   *
   * Beside a menu that also grows to take the room, both end up with half of
   * it: a search box too narrow to read a word in, next to two departments
   * and a "More". So the search takes a named width instead of an elastic
   * one — the same call already made for the search's placement, which `fill`
   * makes moot for the same reason.
   *
   * The small one, not the large one. A shop that chose this menu wants its
   * departments in the bar, and 512px of search box leaves room for one of
   * them. The search box is still there and still a field; it is the
   * departments that would otherwise have nowhere to go.
   */
  const crowded = elastic && !menuHasNothingToShow && menuRow !== 'below';
  const wantsFill = (header?.searchWidth ?? 'fill') === 'fill';
  const searchWidth = crowded && wantsFill ? 'small' : header?.searchWidth ?? 'fill';
  // `condense` is the only behaviour that asks a below-bar menu to fold, and
  // the only one that tightens the bar.
  const condensed = scroll === 'condense' && goingDown;

  const iconButton = clsx(
    'flex h-10 w-10 items-center justify-center rounded-full transition-colors',
    onDark
      ? 'text-white/90 hover:bg-white/15 hover:text-white'
      : 'text-fg-muted hover:bg-surface-alt hover:text-fg',
  );

  /** One menu, or one half of a split one. */
  const drawMenu = (slice: MenuEntry[], links_: MenuLink[], showAll = true) => (
    <Menu
      entries={slice}
      allHref={catalogHref(null)}
      allLabel={t('nav.allProducts')}
      links={links_}
      collapsed={condensed}
      menuLabel={t('nav.menu')}
      linkCase={linkCase}
      onDark={onDark}
      align={logoAt === 'centred' ? 'centre' : 'start'}
      showAll={showAll}
    />
  );

  const menuNode = menuHasNothingToShow ? null : drawMenu(entries, links);

  /* Where it sits, how wide it is and whether it is a field or an icon are
     three separate choices this shop has made. */
  const searchSlot = searchOn ? (
    <HeaderSearchSlot
      storeSlug={storeSlug}
      placement={header?.searchPlacement ?? 'centre'}
      width={searchWidth}
      // A split bar is departments, mark, departments, icons. There is no
      // room left for a field, so the search is its icon — the same demotion
      // `crowded` makes to the width, one step further along.
      behaviour={menuRow === 'split' ? 'tap' : header?.searchBehaviour ?? 'open'}
      spacers={!crowded}
      iconClassName={iconButton}
    />
  ) : null;
  // The departments, cut down the middle. The shop's own links go with the
  // second half, where the eye finishes.
  const half = Math.ceil(entries.length / 2);

  return (
    <>
      <header
        // `relative` on every variant: the mega panel is positioned against
        // this element so it can span the full width of the header rather
        // than the width of the word that opened it.
        className={clsx(
          'relative z-40 transition-[transform,background-color,box-shadow,border-color] duration-300',
          SCROLL_POSITION[scroll],
          // `hide` gives the whole screen back while a shopper reads.
          scroll === 'hide' && goingDown && '-translate-y-full',
          surface === 'floating' && 'bg-transparent px-3 pt-3',
          surface === 'inverse' && 'bg-neutral-950',
          // Over a picture: nothing behind it, or a fade that keeps white
          // type legible over a photograph whose top is too pale for it.
          overBanner && surface === 'transparent' && 'bg-transparent',
          overBanner && surface === 'gradient' &&
            'bg-gradient-to-b from-black/65 via-black/25 to-transparent',
          // Solid is the fallback for every surface once the page has moved,
          // and for every page that has no picture to sit on.
          surface !== 'floating' && surface !== 'inverse' && !overBanner &&
            'bg-surface/95 backdrop-blur',
          // The hairline. A header on a white page without one is a real
          // look, and there was no way to ask for it.
          surface !== 'floating' && header?.showBorder !== false &&
            (onDark ? 'border-b border-white/15' : 'border-b border-line'),
          surface !== 'floating' && scrolled && !onDark && 'shadow-sm',
        )}
      >
        <div
          className={clsx(
            surface === 'floating' &&
              'mx-auto max-w-7xl overflow-hidden rounded-brand-lg bg-surface/95 shadow-lg backdrop-blur',
            surface === 'floating' && header?.showBorder !== false && 'border border-line',
          )}
        >
          {/* Row 1 — brand · menu · search · utilities */}
          <div
            className={clsx(
              'mx-auto max-w-7xl px-4 transition-[height] duration-300 sm:px-6 lg:px-8',
              condensed ? 'h-14' : 'h-16',
              // A centred mark needs equal side columns, or it is centred on
              // the space left over rather than on the page — which is what
              // `justify-between` gives and why it always looks slightly off.
              markCentred
                ? 'grid grid-cols-[1fr_auto_1fr] items-center gap-3 lg:gap-4'
                : 'flex items-center gap-3 lg:gap-4',
            )}
          >
            {markCentred && (
              <div className="flex min-w-0 items-center gap-3">
                {menuRow === 'split' ? drawMenu(entries.slice(0, half), []) : searchSlot}
              </div>
            )}

            <Link
              href={`/${storeSlug}`}
              className={clsx(
                'flex flex-shrink-0 items-center gap-2 text-lg font-bold',
                onDark && 'text-white',
              )}
            >
              <StoreLogo logoUrl={storefrontConfig?.logoUrl} name={storeName(storeConfig)} />
            </Link>

            {!markCentred && menuRow === 'bar' && menuNode}
            {!markCentred && searchSlot}

            <div
              className={clsx(
                'flex items-center gap-0.5 md:gap-1',
                markCentred ? 'min-w-0 justify-end' : 'ml-auto',
              )}
            >
              {/* The way out sits on the half the eye reaches first. */}
              {menuRow === 'split' && drawMenu(entries.slice(half), links, false)}
              {markCentred && menuRow === 'split' && searchSlot}

              {header?.showCurrency === true && (
                // The store's currency, stated. NOT a switcher: there is no
                // exchange rate behind this shop, and a price relabelled into
                // another currency would be a lie about what gets charged.
                <span
                  className={clsx(
                    'hidden px-2 text-sm font-medium sm:inline',
                    onDark ? 'text-white/90' : 'text-fg-muted',
                  )}
                >
                  {storeConfig.currencyCode}
                </span>
              )}

              {header?.showLocation !== false && (
                <StorePicker
                  stores={stores}
                  activeId={activeLocationId}
                  storeSlug={storeSlug}
                  className="hidden lg:flex"
                />
              )}

              {header?.showLanguage !== false && (
                <LanguageSwitcher locales={locales} active={locale} className="hidden sm:block" />
              )}

              {header?.showAccount === false ? null : (
                <Link
                  href={customer ? `/${storeSlug}/account` : `/${storeSlug}/login`}
                  className={iconButton}
                  aria-label={customer ? t('nav.account') : t('nav.signIn')}
                >
                  <User size={20} />
                </Link>
              )}

              {header?.showWishlist !== false && (
                <Link
                  href={`/${storeSlug}/account/wishlist`}
                  className={clsx(iconButton, 'hidden sm:flex')}
                  aria-label={t('nav.wishlist')}
                >
                  <Heart size={20} />
                </Link>
              )}

              {/* The cart is the one action worth an accent — it is where the
                  shopper is heading. A shop that does not sell online — a
                  showroom, a repair shop taking bookings only — has nowhere
                  for a cart to go. */}
              {header?.showCart !== false && (
                <Link
                  href={`/${storeSlug}/cart`}
                  aria-label={t('nav.cart')}
                  className="relative ml-1 flex h-10 w-10 items-center justify-center rounded-full bg-primary-solid text-primary-foreground transition-opacity hover:opacity-90"
                >
                  <ShoppingCart size={18} />
                  {hydrated && itemCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-fg px-1 text-[10px] font-bold text-bg">
                      {itemCount > 9 ? '9+' : itemCount}
                    </span>
                  )}
                </Link>
              )}
            </div>
          </div>

          {/* Row 1b — search on a phone, where it cannot share the top row.
              A phone has no room for an icon that opens sideways, so it gets
              the field whatever the shop chose for a wide screen. */}
          {searchOn && (
            <div className="border-t border-line px-4 py-2 md:hidden">
              <HeaderSearch storeSlug={storeSlug} />
            </div>
          )}

          {/* A style that asked for the bar and was moved under it by the
              mark's position brings no page gutter of its own — the bar was
              providing it. Without this the trigger sits flush against the
              window edge while the mark sits at the gutter, which is what
              `stacked` looked like. The rail already has its own container,
              so it is not given a second one. */}
          {menuRow === 'below' && placement === 'bar' && menuNode && (
            <div
              className={clsx(
                'hidden lg:block',
                header?.showBorder !== false &&
                  (onDark ? 'border-t border-white/15' : 'border-t border-line'),
              )}
            >
              <div
                className={clsx(
                  'mx-auto flex max-w-7xl px-4 py-1.5 sm:px-6 lg:px-8',
                  logoAt === 'centred' ? 'justify-center' : 'justify-start',
                )}
              >
                {menuNode}
              </div>
            </div>
          )}
          {menuRow === 'below' && placement === 'below' && menuNode}
        </div>
      </header>

      <MobileTabBar storeSlug={storeSlug} onOpenMenu={() => setMobileOpen(true)} />

      <MobileNav
        presentation={asMobileMenu(header?.mobileMenu)}
        open={mobileOpen}
        onClose={closeMobile}
        entries={entries}
        links={links}
        allHref={catalogHref(null)}
        allLabel={t('nav.allProducts')}
        menuLabel={t('nav.menu')}
        accountHref={customer ? `/${storeSlug}/account` : `/${storeSlug}/login`}
        accountLabel={customer ? t('nav.account') : t('nav.signIn')}
        storesLabel={t('nav.stores')}
        stores={stores}
        activeLocationId={activeLocationId}
        storeSlug={storeSlug}
        locales={locales}
        locale={locale}
      />
    </>
  );
}
