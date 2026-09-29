'use client';

/**
 * The shop's header.
 *
 * This file builds the PARTS and owns the chrome around them; a header STYLE
 * (../header/layouts) decides only where each part goes.
 *
 * The split is the point. A style is a placement, so a new one is a single
 * file that arranges things which already exist, and it cannot ship a cart
 * button that behaves unlike everybody else's or a search box with its own
 * ideas. Colour and typeface never reach a style at all — they are in the
 * theme tokens the parts carry, so changing header does not change the shop's
 * colours and changing colours does not need the header touched.
 *
 * What stays here:
 *
 *   · the parts — brand, search, each utility, the menu
 *   · `scroll`  — what the bar does as the page moves under it
 *   · `surface` — what it is made of
 *   · `mobileMenu` — the phone, which no desktop style has a say in
 *   · the search axes and the visibility switches
 *
 * The departments are resolved once, here. A style that filtered its own list
 * would drift from the others the first time a merchant hid one — the same
 * reason the API serves the list of style names rather than each app keeping
 * a copy of it.
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
import { headerStyle } from '../header/layouts/registry';
import { MobileNav, asMobileMenu } from '../header/MobileNav';
import { MenuIndex } from '../header/MenuIndex';
import { UtilityBar } from '../header/UtilityBar';
import {
  asLinkCase, asScroll, asSurface, useOverBanner, usePastTop,
  OVER_BANNER_SURFACES,
} from '../header/chrome';
import { CompactBar } from '../header/CompactBar';
import type { Scroll } from '../header/chrome';
import { resolveMenu, targetHref } from '@/lib/navigation';
import type { MenuNode } from '@/lib/navigation';
import type { MenuOptions } from '../header/layout-types';
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
  'compact':  'sticky top-0',
  'static':   'relative',
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
  const wanted = menuStyle(header?.menu);

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

  /**
   * The shop's menu.
   *
   * Built from the tree the merchant owns, or — for every shop that predates
   * one — generated from the departments exactly as this header always did.
   * `resolveMenu` owns both, so a style never sees the difference and the
   * back office can offer "start from my departments" by writing out what it
   * already generates.
   *
   * The merchant's hidden-department list and their featured set still apply:
   * those say which departments belong in a shop window at all, which is a
   * different question from what order a menu puts them in.
   */
  const visibleCategories = useMemo(
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
            : 0),
    [categories, hiddenCategories, railStyle, featuredIds],
  );

  const menu = useMemo(
    () =>
      resolveMenu(storefrontConfig, {
        storeSlug,
        categories: visibleCategories,
        catalogHref,
        hasBooking: showBooking,
        hasRepairs: showTracking,
        labels: {
          allProducts: t('nav.allProducts'),
          book: 'Book',
          repairs: 'Track Order',
          account: t('nav.account'),
        },
      }),
    [storefrontConfig, storeSlug, visibleCategories, catalogHref, showBooking, showTracking, t],
  );
  const nodes: MenuNode[] = menu.nodes;

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
  const chosen = headerStyle(header?.style);
  const { Component: Layout, centreMenu: markCentred } = chosen;

  // A style whose bar is a single button names its own menu: there is
  // nowhere to draw a rail or a row of departments, so four of the five
  // choices could not be honoured.
  //
  // Otherwise: a style with one row has nowhere to put a rail, which is a
  // full-width row that brings its own page gutter — drawn inside a column a
  // third of the page wide it is not a rail, it is a mess. Swap it for the
  // in-bar list, which is the same departments in the space that exists.
  //
  // `tiles` pays the most for this: the swap keeps the departments and
  // drops the pictures, which were the whole reason for choosing it. The
  // back office says so on the option rather than the shop finding out.
  const needsInBar = chosen.menuRow === 'bar';
  const { placement, elastic, Component: Menu } =
    chosen.forceMenu ? menuStyle(chosen.forceMenu)
    : needsInBar && wanted.placement === 'below' ? menuStyle('inline')
    : wanted;

  const menuHasNothingToShow = railStyle === 'off' || nodes.length === 0;

  /** Which row the departments end up in, once the style has had its say. */
  const menuRow: 'bar' | 'below' =
    chosen.menuRow === 'below' ? 'below'
    : chosen.menuRow === 'bar' ? 'bar'
    : placement;

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
  /**
   * Whether the header has been replaced by the short one.
   *
   * Only `compact` does this, and only once the reader is properly into the
   * page — see `usePastTop`, which comes back higher than it leaves so
   * sitting on the boundary cannot flicker between two headers.
   */
  const past = usePastTop();
  const compact = scroll === 'compact' && past;

  const iconButton = clsx(
    'flex h-10 w-10 items-center justify-center rounded-full transition-colors',
    onDark
      ? 'text-white/90 hover:bg-white/15 hover:text-white'
      : 'text-fg-muted hover:bg-surface-alt hover:text-fg',
  );

  /** One menu, or one half of a split one. */
  /**
   * A plain search field, for a menu that opens a panel with room for one.
   *
   * Not the header's search slot: that one is placed, sized and possibly an
   * icon, and none of those decisions mean anything inside a panel a column
   * wide. A shop that has switched search off gets none here either.
   */
  const panelSearch = searchOn ? <HeaderSearch storeSlug={storeSlug} /> : null;

  /** The page gutter every row shares, so rows line up with the page. */
  const container = 'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8';
  const rule = onDark ? 'border-t border-white/15' : 'border-t border-line';

  const brand = (
    <Link
      href={`/${storeSlug}`}
      className={clsx(
        'flex flex-shrink-0 items-center gap-2 text-lg font-bold',
        onDark && 'text-white',
      )}
    >
      <StoreLogo logoUrl={storefrontConfig?.logoUrl} name={storeName(storeConfig)} />
    </Link>
  );

  /**
   * The departments.
   *
   * Every style draws the same menu through this — one place where the menu's
   * props are decided, so a new style cannot forget the link case or pass a
   * way-out the merchant never asked for.
   */
  const drawMenu = useCallback(
    ({ showAll = true, align }: MenuOptions = {}) => (
      <Menu
        nodes={nodes}
        allHref={catalogHref(null)}
        allLabel={t('nav.allProducts')}
        collapsed={condensed}
        menuLabel={t('nav.menu')}
        linkCase={linkCase}
        onDark={onDark}
        // Only a panel menu uses these, and only it has room for them.
        brand={brand}
        search={panelSearch}
        align={align ?? (markCentred ? 'centre' : 'start')}
        // Only the generated menu gets a way-out added to it. In a menu the
        // merchant built it is an entry they never added and cannot move.
        showAll={showAll && menu.generated}
      />
    ),
    [Menu, nodes, menu.generated, catalogHref, t, condensed, linkCase, onDark,
     markCentred, brand, panelSearch],
  );

  const menuNode = menuHasNothingToShow ? null : drawMenu();
  const menuIndex = menuHasNothingToShow ? null : (
    <MenuIndex nodes={nodes} label={t('nav.menu')} onDark={onDark} />
  );

  /**
   * The mark with the shop's tagline under it.
   *
   * Identical to the mark when there is no tagline, so a layout can reach for
   * this without checking and never gets a gap where a line should be.
   */
  const tagline = (storefrontConfig?.wordmarkTagline ?? '').trim();
  const taglineRule = clsx('h-px flex-1', onDark ? 'bg-white/25' : 'bg-line');
  const brandLockup = !tagline ? brand : (
    <span
      className={clsx(
        'flex min-w-0 flex-col gap-1',
        chosen.markStart ? 'items-start' : 'items-center',
      )}
    >
      {brand}
      <span
        className={clsx(
          'flex w-full min-w-0 items-center gap-2 text-[0.6875rem] uppercase tracking-[0.18em]',
          onDark ? 'text-white/70' : 'text-fg-subtle',
        )}
      >
        {/* A rule either side is what makes a line of small caps read as part
            of the mark rather than as a sentence under it — but only under a
            CENTRED mark. Beside a left-aligned one the leading rule has
            nothing to balance and runs back to the page edge. */}
        {!chosen.markStart && <span className={taglineRule} />}
        {/* Truncates rather than `nowrap`: a long tagline in a column narrower
            than itself does not overflow the gutter, it ends with an
            ellipsis. */}
        <span className="min-w-0 truncate">{tagline}</span>
        <span className={taglineRule} />
      </span>
    </span>
  );

  /**
   * The shop's one important button.
   *
   * A service business has a click worth more than every other click on the
   * page — book, enquire, get a quote — and it had nowhere to be but a menu
   * entry beside the departments. It sits at the front of the utilities, so
   * every layout gets it without knowing about it, and it reads as an action
   * rather than as another icon.
   *
   * The API blanks the label when the target names nothing, so a button that
   * would go nowhere never reaches here.
   */
  const actionLabel = (header?.actionLabel ?? '').trim();
  const action = (() => {
    if (!actionLabel) return null;
    const { href, external } = targetHref(
      header?.actionTarget ?? 'catalog', header?.actionValue ?? '',
      { storeSlug, catalogHref },
    );
    if (!href) return null;
    const className = clsx(
      'hidden whitespace-nowrap rounded-brand px-3.5 py-2 text-sm font-semibold',
      'transition-opacity hover:opacity-90 sm:inline-flex',
      // Outlined on a dark or photographic bar, where a filled button in the
      // brand colour competes with the cart for the same job.
      onDark
        ? 'border border-white/40 text-white'
        : 'bg-primary-solid text-primary-foreground',
    );
    return external ? (
      <a key="action" href={href} className={className} target="_blank" rel="noreferrer">
        {actionLabel}
      </a>
    ) : (
      <Link key="action" href={href} className={className}>
        {actionLabel}
      </Link>
    );
  })();

  const utilities = {
    currency: header?.showCurrency === true ? (
      // The store's currency, stated. NOT a switcher: there is no exchange
      // rate behind this shop, and a price relabelled into another currency
      // would be a lie about what gets charged.
      <span
        key="currency"
        className={clsx(
          'hidden px-2 text-sm font-medium sm:inline',
          onDark ? 'text-white/90' : 'text-fg-muted',
        )}
      >
        {storeConfig.currencyCode}
      </span>
    ) : null,
    location: header?.showLocation !== false ? (
      <StorePicker
        key="location"
        stores={stores}
        activeId={activeLocationId}
        storeSlug={storeSlug}
        className="hidden lg:flex"
      />
    ) : null,
    language: header?.showLanguage !== false ? (
      <LanguageSwitcher key="language" locales={locales} active={locale} className="hidden sm:block" />
    ) : null,
    account: header?.showAccount === false ? null : (
      <Link
        key="account"
        href={customer ? `/${storeSlug}/account` : `/${storeSlug}/login`}
        className={iconButton}
        aria-label={customer ? t('nav.account') : t('nav.signIn')}
      >
        <User size={20} />
      </Link>
    ),
    wishlist: header?.showWishlist !== false ? (
      <Link
        key="wishlist"
        href={`/${storeSlug}/account/wishlist`}
        className={clsx(iconButton, 'hidden sm:flex')}
        aria-label={t('nav.wishlist')}
      >
        <Heart size={20} />
      </Link>
    ) : null,
    // The cart is the one action worth an accent — it is where the shopper is
    // heading. A shop that does not sell online — a showroom, a repair shop
    // taking bookings only — has nowhere for a cart to go.
    cart: header?.showCart !== false ? (
      <Link
        key="cart"
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
    ) : null,
  };

  /**
   * Whether the three shop-describing controls live above the bar.
   *
   * With a strip they do, and the bar keeps only what a shopper reaches for
   * — which is what lets a `spare` layout offer them at all, rather than
   * dropping them to stay centred.
   */
  const strip = header?.utilityBar === 'on';

  /**
   * The three a shopper reaches for, and the three that describe the shop.
   *
   * A `spare` layout keeps only the first three — see the registry. The
   * short version: a store picker with a town name in it is what stops
   * anything being centred, and it is not what a shopper opens a menu for.
   */
  /**
   * The same controls, named.
   *
   * Built from the same parts rather than a second set: a caption under an
   * icon must not be a second chance to get the icon wrong.
   */
  const labelled = (node: React.ReactNode, caption: string) =>
    node == null ? null : (
      <span className="flex flex-col items-center gap-1">
        {node}
        <span className={clsx('text-[0.6875rem]', onDark ? 'text-white/80' : 'text-fg-muted')}>
          {caption}
        </span>
      </span>
    );

  const utilityRowLabelled = (
    <>
      {action}
      {labelled(utilities.account, customer ? t('nav.account') : t('nav.signIn'))}
      {labelled(utilities.wishlist, t('nav.wishlist'))}
      {labelled(utilities.cart, t('nav.cart'))}
    </>
  );

  const utilityRow = (
    <>
      {action}
      {!chosen.spare && !strip && utilities.currency}
      {!chosen.spare && !strip && utilities.location}
      {!chosen.spare && !strip && utilities.language}
      {utilities.account}
      {utilities.wishlist}
      {utilities.cart}
    </>
  );

  /* Where it sits, how wide it is and whether it is a field or an icon are
     three separate choices this shop has made. */
  const searchSlot = searchOn ? (
    <HeaderSearchSlot
      storeSlug={storeSlug}
      // A layout that gives search a column of its own has already placed
      // it; the shop's setting is for arrangements where it shares a row.
      placement={chosen.centreSearch ? 'centre' : header?.searchPlacement ?? 'centre'}
      width={searchWidth}
      behaviour={header?.searchBehaviour ?? 'open'}
      spacers={!crowded}
      iconClassName={iconButton}
      brand={brand}
      // Only the three a shopper might reach for mid-search. The store
      // picker, the language switcher and the currency belong to browsing,
      // not to typing a query — and they are wide, which is what stopped the
      // field being centred on the page at all.
      utilities={
        <>
          {utilities.account}
          {utilities.wishlist}
          {utilities.cart}
        </>
      }
      container={container}
    />
  ) : null;

  /**
   * The menu ready to sit under the bar, whichever kind it is.
   *
   * A rail brings its own gutter and rule. A trigger does not — it was
   * getting them from the bar — so a style that moves one under the bar has
   * to be handed it already wrapped, or it comes out flush against the
   * window edge while the mark sits at the gutter.
   */
  const menuBelow = menuHasNothingToShow || menuRow !== 'below' ? null
    : placement === 'below' ? menuNode
    : (
      <div className={clsx('hidden lg:block', header?.showBorder !== false && rule)}>
        <div className={clsx(container, 'flex py-1.5', markCentred ? 'justify-center' : 'justify-start')}>
          {menuNode}
        </div>
      </div>
    );

  return (
    <>
      {strip && !compact && (
        <UtilityBar
          message={(header?.utilityMessage ?? '').trim()}
          controls={
            <>
              {utilities.currency}
              {utilities.location}
              {utilities.language}
            </>
          }
          container={container}
        />
      )}
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
          {/* Everything above is the chrome; where the parts go is the
              style's business and nothing else's — until the reader is into
              the page, when the header stops introducing the shop and
              becomes a way back, a way to everything, and the basket. */}
          {compact ? (
            <CompactBar
              brand={brand}
              menuIndex={menuIndex}
              search={searchSlot}
              action={action}
              cart={utilities.cart}
              container={container}
            />
          ) : (
          <Layout
            brand={brand}
            brandLockup={brandLockup}
            search={searchSlot}
            menu={drawMenu}
            menuPlacement={placement}
            menuInBar={menuRow === 'bar' ? menuNode : null}
            menuIndex={menuIndex}
            menuBelow={menuBelow}
            menuEmpty={menuHasNothingToShow}
            utilities={utilities}
            utilityRow={utilityRow}
            utilityRowLabelled={utilityRowLabelled}
            onDark={onDark}
            condensed={condensed}
            container={container}
            barHeight={clsx('transition-[height] duration-300', condensed ? 'h-14' : 'h-16')}
            rule={rule}
          />
          )}
        </div>
      </header>

      <MobileTabBar storeSlug={storeSlug} onOpenMenu={() => setMobileOpen(true)} />

      <MobileNav
        presentation={asMobileMenu(header?.mobileMenu)}
        open={mobileOpen}
        onClose={closeMobile}
        nodes={nodes}
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
