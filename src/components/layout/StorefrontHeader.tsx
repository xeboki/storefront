'use client';

/**
 * Two-tier header.
 *
 * Row one is the utility bar: brand, search, and the controls a shopper
 * reaches for — store, language, account, saved, cart. Row two is the category
 * rail, which only earns its space on a wide screen.
 *
 * Search used to live on the catalog page alone and the categories were shown
 * only once you were already there, so from the home page or a product there
 * was no way to move sideways through the shop. On a phone the rail collapses
 * and MobileTabBar takes over at the bottom of the screen.
 */
import Link from 'next/link';
import { storeName } from '@/lib/store-name';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { clsx } from 'clsx';
import { ShoppingCart, User, X, Heart, Calendar, Wrench, MapPin } from 'lucide-react';
import { ColorSchemeToggle } from './ColorSchemeToggle';
import { StorePicker } from './StorePicker';
import { LanguageSwitcher } from './LanguageSwitcher';
import { HeaderSearch } from './HeaderSearch';
import { HeaderSearchSlot } from './HeaderSearchSlot';
import { MobileTabBar } from './MobileTabBar';
import { ScrollRail } from './ScrollRail';
import { StoreLogo } from './StoreLogo';
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

interface Props {
  storeConfig: StoreConfig;
  storefrontConfig: StorefrontConfig | null;
  storeSlug: string;
  /** Branches to choose between. Empty unless the shop browses store-first. */
  stores: FulfillmentLocation[];
  activeLocationId: string | null;
  /** The category rail. */
  categories: OrderingCategory[];
  locales: string[];
  locale: string;
}

export function StorefrontHeader({
  storeConfig, storefrontConfig, storeSlug, stores, activeLocationId,
  categories, locales, locale,
}: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  // The cart lives in localStorage, so the server cannot know it. Showing the
  // badge before hydration made React discard the header's markup.
  const hydrated = useHydrated();
  const itemCount = useCartStore((s) => s.itemCount());
  const customer = useAuthStore((s) => s.customer);
  const businessType = useStoreConfigStore((s) => s.businessType);
  const t = useT();
  // The category rail is for choosing where to go; once a shopper is reading,
  // it is just a band of text between them and the page. It folds away on the
  // way down and comes back the moment they head up.
  const { hidden: railHidden, scrolled } = useScrollDirection();

  const showBooking = hasAppointments(businessType);
  const showTracking = hasWorkOrders(businessType);
  const customNavLinks: NavLink[] = storefrontConfig?.navLinks ?? [];

  // How this shop wants its header. The API fills every field and falls back
  // on anything it does not recognise, so nothing here has to be defended
  // against a half-written setting.
  const header = storefrontConfig?.headerSettings;
  const searchOn = (header?.search ?? 'on') !== 'off';
  const railStyle = header?.categoryRail ?? 'all';
  const hiddenCategories = new Set(header?.hiddenCategoryIds ?? []);
  const featuredIds = storefrontConfig?.featuredCategoryIds ?? [];

  const rail = categories
    .filter((c) => c.id !== '_uncategorized')
    .filter((c) => !hiddenCategories.has(c.id))
    // 'featured' shows the merchant's chosen set, in the order they arranged
    // it — but only once they have chosen one. A shop that picked nothing
    // would otherwise get an empty bar where its departments were.
    .filter((c) => railStyle !== 'featured' || featuredIds.length === 0 || featuredIds.includes(c.id))
    .sort((a, b) =>
      railStyle === 'featured' && featuredIds.length
        ? featuredIds.indexOf(a.id) - featuredIds.indexOf(b.id)
        : 0);

  // Carry the catalog's own state across a category change — the search term,
  // the sort and the chosen store — so picking "Clothing" does not silently
  // throw away what the shopper had narrowed to. Only these four: the header
  // is on every page, and a stray param from an order page does not belong on
  // a catalog link.
  const params = useSearchParams();
  const catalogHref = (categoryId: string | null) => {
    const next = new URLSearchParams();
    for (const key of ['q', 'sort', 'instock', 'loc']) {
      const value = params.get(key);
      if (value) next.set(key, value);
    }
    if (categoryId) next.set('category', categoryId);
    const qs = next.toString();
    return `/${storeSlug}/catalog${qs ? `?${qs}` : ''}`;
  };

  const iconButton =
    'flex h-10 w-10 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-surface-alt hover:text-fg';

  return (
    <>
      <header
        className={clsx(
          header?.sticky === false ? 'relative' : 'sticky top-0',
          'z-40 border-b border-line bg-surface/95 backdrop-blur',
          'transition-shadow duration-300',
          scrolled && 'shadow-sm',
        )}
      >
        {/* Row 1 — brand · search · utilities */}
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:gap-6 lg:px-8">
          <Link
            href={`/${storeSlug}`}
            className="flex flex-shrink-0 items-center gap-2 text-lg font-bold"
          >
            <StoreLogo logoUrl={storefrontConfig?.logoUrl} name={storeName(storeConfig)} />
          </Link>

          {/* Where it sits, how wide it is and whether it is a field or an
              icon are three separate choices this shop has made. */}
          {searchOn && (
            <HeaderSearchSlot
              storeSlug={storeSlug}
              placement={header?.searchPlacement ?? 'centre'}
              width={header?.searchWidth ?? 'fill'}
              behaviour={header?.searchBehaviour ?? 'open'}
              iconClassName={iconButton}
            />
          )}

          <div className="ml-auto flex items-center gap-0.5 md:gap-1">
            {header?.showCurrency !== false && header?.showCurrency && (
              // The store's currency, stated. NOT a switcher: there is no
              // exchange rate behind this shop, and a price relabelled into
              // another currency would be a lie about what gets charged.
              <span className="hidden px-2 text-sm font-medium text-fg-muted sm:inline">
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

            {header?.showAccount === false ? null : customer ? (
              <Link href={`/${storeSlug}/account`} className={iconButton} aria-label={t('nav.account')}>
                <User size={20} />
              </Link>
            ) : (
              <Link href={`/${storeSlug}/login`} className={iconButton} aria-label={t('nav.signIn')}>
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
                shopper is heading. */}
            {/* A shop that does not sell online — a showroom, a repair shop
                taking bookings only — has nowhere for a cart to go. */}
            {header?.showCart !== false && (
              <Link
                href={`/${storeSlug}/cart`}
                aria-label={t('nav.cart')}
                className="relative ml-1 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90"
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
            A phone has no room for an icon that opens sideways, so it gets the
            field whatever the shop chose for a wide screen. */}
        {searchOn && (
          <div className="border-t border-line px-4 py-2 md:hidden">
            <HeaderSearch storeSlug={storeSlug} />
          </div>
        )}

        {/* Row 2 — the category rail */}
        {railStyle !== 'off' && (rail.length > 0 || customNavLinks.length > 0) && (
          <nav
            aria-label="Categories"
            // grid-rows trick: animating to `auto` is not possible, and a fixed
            // max-height would either clip a wrapped rail or leave dead space.
            className={clsx(
              'hidden border-t border-line sm:grid',
              'motion-safe:transition-[grid-template-rows,opacity] motion-safe:duration-300 motion-safe:ease-out',
              railHidden ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100',
            )}
          >
            <div className="overflow-hidden">
            <ScrollRail
              fade="from-surface"
              className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
              trackClassName="flex items-center gap-6 py-3 text-sm font-medium uppercase tracking-wide"
            >
              <Link
                href={catalogHref(null)}
                className="whitespace-nowrap text-fg transition-colors hover:text-primary"
              >
                {t('nav.allProducts')}
              </Link>
              {rail.map((cat) => (
                <Link
                  key={cat.id}
                  href={catalogHref(cat.id)}
                  className="whitespace-nowrap text-fg-muted transition-colors hover:text-primary"
                >
                  {cat.name}
                </Link>
              ))}
              {showBooking && (
                <Link href={`/${storeSlug}/book`} className="whitespace-nowrap text-fg-muted hover:text-primary">
                  Book
                </Link>
              )}
              {showTracking && (
                <Link href={`/${storeSlug}/repairs`} className="whitespace-nowrap text-fg-muted hover:text-primary">
                  Track Order
                </Link>
              )}
              {customNavLinks.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  className="whitespace-nowrap text-fg-muted transition-colors hover:text-primary"
                >
                  {link.label}
                </a>
              ))}
            </ScrollRail>
            </div>
          </nav>
        )}
      </header>

      <MobileTabBar storeSlug={storeSlug} onOpenMenu={() => setMobileOpen(true)} />

      {/* The rest of the shop, for a phone. Opened from the tab bar's Menu. */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <button
            type="button"
            aria-label="Close menu"
            className="animate-fade absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="animate-sheet relative max-h-[85vh] overflow-y-auto rounded-t-brand-lg border-t border-line bg-surface pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <div className="sticky top-0 flex items-center justify-between border-b border-line bg-surface px-4 py-3">
              <span className="font-semibold text-fg">{t('nav.menu')}</span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close"
                className="flex h-9 w-9 items-center justify-center rounded-brand text-fg-muted hover:bg-surface-alt hover:text-fg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-2 py-2">
              {rail.slice(0, 12).map((cat) => (
                <Link
                  key={cat.id}
                  href={catalogHref(cat.id)}
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-brand px-3 py-3 text-sm font-medium text-fg hover:bg-surface-alt"
                >
                  {cat.name}
                </Link>
              ))}

              {showBooking && (
                <Link href={`/${storeSlug}/book`} onClick={() => setMobileOpen(false)} className="flex items-center gap-2 rounded-brand px-3 py-3 text-sm font-medium text-fg hover:bg-surface-alt">
                  <Calendar size={16} className="text-fg-subtle" /> Book
                </Link>
              )}
              {showTracking && (
                <Link href={`/${storeSlug}/repairs`} onClick={() => setMobileOpen(false)} className="flex items-center gap-2 rounded-brand px-3 py-3 text-sm font-medium text-fg hover:bg-surface-alt">
                  <Wrench size={16} className="text-fg-subtle" /> Track Order
                </Link>
              )}
              <Link
                href={customer ? `/${storeSlug}/account` : `/${storeSlug}/login`}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 rounded-brand px-3 py-3 text-sm font-medium text-fg hover:bg-surface-alt"
              >
                <User size={16} className="text-fg-subtle" />
                {customer ? t('nav.account') : t('nav.signIn')}
              </Link>
              {customNavLinks.map((link) => (
                <a key={link.url} href={link.url} className="block rounded-brand px-3 py-3 text-sm font-medium text-fg hover:bg-surface-alt">
                  {link.label}
                </a>
              ))}

              {stores.length > 0 && (
                <div className="mt-1 flex items-center justify-between border-t border-line px-3 pt-3">
                  <span className="flex items-center gap-1.5 text-sm text-fg-muted">
                    <MapPin size={15} /> {t('nav.stores')}
                  </span>
                  <StorePicker stores={stores} activeId={activeLocationId} storeSlug={storeSlug} />
                </div>
              )}

              <div className="flex items-center justify-between border-t border-line px-3 pt-3">
                <span className="text-sm text-fg-muted">Language</span>
                <LanguageSwitcher locales={locales} active={locale} />
              </div>

              <div className="flex items-center justify-between border-t border-line px-3 pt-3">
                <span className="text-sm text-fg-muted">Appearance</span>
                <ColorSchemeToggle compact />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
