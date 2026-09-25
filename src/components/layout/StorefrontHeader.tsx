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
import { useState } from 'react';
import { clsx } from 'clsx';
import { ShoppingCart, User, X, Heart, Calendar, Wrench, MapPin } from 'lucide-react';
import { ColorSchemeToggle } from './ColorSchemeToggle';
import { StorePicker } from './StorePicker';
import { LanguageSwitcher } from './LanguageSwitcher';
import { HeaderSearch } from './HeaderSearch';
import { MobileTabBar } from './MobileTabBar';
import { ProductImage } from '@/components/product/ProductImage';
import { useHydrated } from '@/lib/use-hydrated';
import { useCartStore } from '@/stores/cartStore';
import { useAuthStore } from '@/stores/authStore';
import { useStoreConfigStore, APPOINTMENT_TYPES, WORK_ORDER_TYPES } from '@/stores/storeConfigStore';
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

  const hasAppointments = APPOINTMENT_TYPES.has(businessType);
  const hasWorkOrders = WORK_ORDER_TYPES.has(businessType);
  const customNavLinks: NavLink[] = storefrontConfig?.navLinks ?? [];
  const rail = categories.filter((c) => c.id !== '_uncategorized');

  const iconButton =
    'flex h-10 w-10 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-surface-alt hover:text-fg';

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur">
        {/* Row 1 — brand · search · utilities */}
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:gap-6 lg:px-8">
          <Link
            href={`/${storeSlug}`}
            className="flex flex-shrink-0 items-center gap-2 text-lg font-bold"
          >
            <ProductImage
              src={storefrontConfig?.logoUrl}
              alt={storeConfig.businessName}
              width={140}
              height={36}
              className="h-9 w-auto object-contain"
              fallback={<span className="text-primary">{storeConfig.businessName}</span>}
            />
          </Link>

          {/* The search field gets the middle of the bar, as the thing most
              shoppers are actually trying to do. */}
          <HeaderSearch storeSlug={storeSlug} className="hidden flex-1 md:block" />

          <div className="ml-auto flex items-center gap-0.5 md:gap-1">
            <StorePicker
              stores={stores}
              activeId={activeLocationId}
              storeSlug={storeSlug}
              className="hidden lg:flex"
            />

            <LanguageSwitcher locales={locales} active={locale} className="hidden sm:block" />

            {customer ? (
              <Link href={`/${storeSlug}/account`} className={iconButton} aria-label={t('nav.account')}>
                <User size={20} />
              </Link>
            ) : (
              <Link href={`/${storeSlug}/login`} className={iconButton} aria-label={t('nav.signIn')}>
                <User size={20} />
              </Link>
            )}

            <Link
              href={`/${storeSlug}/account/wishlist`}
              className={clsx(iconButton, 'hidden sm:flex')}
              aria-label={t('nav.wishlist')}
            >
              <Heart size={20} />
            </Link>

            {/* The cart is the one action worth an accent — it is where the
                shopper is heading. */}
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
          </div>
        </div>

        {/* Row 1b — search on a phone, where it cannot share the top row */}
        <div className="border-t border-line px-4 py-2 md:hidden">
          <HeaderSearch storeSlug={storeSlug} />
        </div>

        {/* Row 2 — the category rail */}
        {(rail.length > 0 || customNavLinks.length > 0) && (
          <nav
            aria-label="Categories"
            className="hidden border-t border-line lg:block"
          >
            <div className="mx-auto flex max-w-7xl items-center gap-6 overflow-x-auto px-4 py-3 text-sm font-medium uppercase tracking-wide scrollbar-hide sm:px-6 lg:px-8">
              <Link
                href={`/${storeSlug}/catalog`}
                className="whitespace-nowrap text-fg transition-colors hover:text-primary"
              >
                {t('nav.allProducts')}
              </Link>
              {rail.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/${storeSlug}/catalog?category=${cat.id}`}
                  className="whitespace-nowrap text-fg-muted transition-colors hover:text-primary"
                >
                  {cat.name}
                </Link>
              ))}
              {hasAppointments && (
                <Link href={`/${storeSlug}/book`} className="whitespace-nowrap text-fg-muted hover:text-primary">
                  Book
                </Link>
              )}
              {hasWorkOrders && (
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
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative max-h-[85vh] overflow-y-auto rounded-t-brand-lg border-t border-line bg-surface pb-[calc(1rem+env(safe-area-inset-bottom))]">
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
                  href={`/${storeSlug}/catalog?category=${cat.id}`}
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-brand px-3 py-3 text-sm font-medium text-fg hover:bg-surface-alt"
                >
                  {cat.name}
                </Link>
              ))}

              {hasAppointments && (
                <Link href={`/${storeSlug}/book`} onClick={() => setMobileOpen(false)} className="flex items-center gap-2 rounded-brand px-3 py-3 text-sm font-medium text-fg hover:bg-surface-alt">
                  <Calendar size={16} className="text-fg-subtle" /> Book
                </Link>
              )}
              {hasWorkOrders && (
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
