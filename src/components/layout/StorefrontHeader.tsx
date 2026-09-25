'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ShoppingCart, User, Menu, X, Search, Heart, Calendar, Wrench, MapPin } from 'lucide-react';
import { ColorSchemeToggle } from './ColorSchemeToggle';
import { StorePicker } from './StorePicker';
import { useHydrated } from '@/lib/use-hydrated';
import { useState } from 'react';
import { useCartStore } from '@/stores/cartStore';
import { useAuthStore } from '@/stores/authStore';
import { useStoreConfigStore, APPOINTMENT_TYPES, WORK_ORDER_TYPES } from '@/stores/storeConfigStore';
import { useT } from '@/lib/i18n/client';
import type { StoreConfig, StorefrontConfig, NavLink, FulfillmentLocation } from '@xeboki/sdk';

interface Props {
  storeConfig: StoreConfig;
  storefrontConfig: StorefrontConfig | null;
  storeSlug: string;
  /** Branches to choose between. Empty unless the shop browses store-first. */
  stores: FulfillmentLocation[];
  activeLocationId: string | null;
}

export function StorefrontHeader({
  storeConfig, storefrontConfig, storeSlug, stores, activeLocationId,
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

  return (
    <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur border-b border-line">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo / brand */}
          <Link href={`/${storeSlug}`} className="flex items-center gap-2 font-bold text-lg flex-shrink-0">
            {storefrontConfig?.logoUrl ? (
              <Image
                src={storefrontConfig.logoUrl}
                alt={storeConfig.businessName}
                width={120}
                height={32}
                className="h-8 w-auto object-contain"
              />
            ) : (
              <span className="text-primary">{storeConfig.businessName}</span>
            )}
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link href={`/${storeSlug}/catalog`} className="text-fg-muted hover:text-primary transition-colors">
              {t('nav.shop')}
            </Link>
            {stores.length > 1 && (
              <Link href={`/${storeSlug}/locations`} className="text-fg-muted hover:text-primary transition-colors">
                Stores
              </Link>
            )}
            {hasAppointments && (
              <Link href={`/${storeSlug}/book`} className="text-fg-muted hover:text-primary transition-colors">
                Book
              </Link>
            )}
            {hasWorkOrders && (
              <Link href={`/${storeSlug}/repairs`} className="text-fg-muted hover:text-primary transition-colors">
                Track Order
              </Link>
            )}
            {/* Custom nav links from merchant config */}
            {customNavLinks.map((link) => (
              <a
                key={link.url}
                href={link.url}
                target={link.openInNewTab ? '_blank' : undefined}
                rel={link.openInNewTab ? 'noopener noreferrer' : undefined}
                className="text-fg-muted hover:text-primary transition-colors"
              >
                {link.label}
              </a>
            ))}

            {customer && (
              <Link href={`/${storeSlug}/account`} className="text-fg-muted hover:text-primary transition-colors">
                My Account
              </Link>
            )}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <Link
              href={`/${storeSlug}/catalog`}
              className="p-2 text-fg-muted hover:text-primary transition-colors"
              aria-label="Search"
            >
              <Search size={20} />
            </Link>

            {hasAppointments && (
              <Link
                href={`/${storeSlug}/book`}
                className="p-2 text-fg-muted hover:text-primary transition-colors hidden md:block"
                aria-label="Book appointment"
              >
                <Calendar size={20} />
              </Link>
            )}

            {customer && (
              <Link
                href={`/${storeSlug}/account/wishlist`}
                className="p-2 text-fg-muted hover:text-primary transition-colors"
                aria-label="Wishlist"
              >
                <Heart size={20} />
              </Link>
            )}

            {customer ? (
              <Link
                href={`/${storeSlug}/account`}
                className="p-2 text-fg-muted hover:text-primary transition-colors"
                aria-label="Account"
              >
                <User size={20} />
              </Link>
            ) : (
              <Link
                href={`/${storeSlug}/login`}
                className="hidden md:block text-sm font-medium text-fg-muted hover:text-primary transition-colors px-2"
              >
                {t('nav.signIn')}
              </Link>
            )}

            <StorePicker
              stores={stores}
              activeId={activeLocationId}
              storeSlug={storeSlug}
              className="hidden md:flex"
            />

            <ColorSchemeToggle className="hidden md:inline-flex" />

            <Link
              href={`/${storeSlug}/cart`}
              className="relative p-2 text-fg-muted hover:text-primary transition-colors"
              aria-label="Cart"
            >
              <ShoppingCart size={20} />
              {hydrated && itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
                  {itemCount > 9 ? '9+' : itemCount}
                </span>
              )}
            </Link>

            <button
              className="md:hidden p-2 text-fg-muted"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Menu"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-line bg-surface px-4 py-3 space-y-1">
          <Link href={`/${storeSlug}/catalog`} className="flex items-center gap-2 py-2.5 text-fg font-medium" onClick={() => setMobileOpen(false)}>
            <Search size={16} className="text-fg-subtle" /> Shop
          </Link>
          {stores.length > 1 && (
            <Link href={`/${storeSlug}/locations`} className="flex items-center gap-2 py-2.5 text-fg font-medium" onClick={() => setMobileOpen(false)}>
              <MapPin size={16} className="text-fg-subtle" /> Our stores
            </Link>
          )}
          {hasAppointments && (
            <Link href={`/${storeSlug}/book`} className="flex items-center gap-2 py-2.5 text-fg font-medium" onClick={() => setMobileOpen(false)}>
              <Calendar size={16} className="text-fg-subtle" /> Book Appointment
            </Link>
          )}
          {hasWorkOrders && (
            <Link href={`/${storeSlug}/repairs`} className="flex items-center gap-2 py-2.5 text-fg font-medium" onClick={() => setMobileOpen(false)}>
              <Wrench size={16} className="text-fg-subtle" /> Track Order
            </Link>
          )}
          {customer ? (
            <>
              <Link href={`/${storeSlug}/account`} className="flex items-center gap-2 py-2.5 text-fg font-medium" onClick={() => setMobileOpen(false)}>
                <User size={16} className="text-fg-subtle" /> My Account
              </Link>
              <Link href={`/${storeSlug}/account/appointments`} className="flex items-center gap-2 py-2.5 text-fg font-medium" onClick={() => setMobileOpen(false)}>
                <Calendar size={16} className="text-fg-subtle" /> My Appointments
              </Link>
            </>
          ) : (
            <Link href={`/${storeSlug}/login`} className="flex items-center gap-2 py-2.5 text-fg font-medium" onClick={() => setMobileOpen(false)}>
              <User size={16} className="text-fg-subtle" /> Sign in
            </Link>
          )}

          {stores.length > 0 && (
            <div className="flex items-center justify-between border-t border-line pt-3 mt-1">
              <span className="text-sm text-fg-muted">Shopping at</span>
              <StorePicker stores={stores} activeId={activeLocationId} storeSlug={storeSlug} />
            </div>
          )}

          <div className="flex items-center justify-between border-t border-line pt-3 mt-1">
            <span className="text-sm text-fg-muted">Appearance</span>
            <ColorSchemeToggle />
          </div>
        </div>
      )}
    </header>
  );
}
