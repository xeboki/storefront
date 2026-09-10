'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ShoppingCart, User, Menu, X, Search, Heart, Calendar, Wrench } from 'lucide-react';
import { useState } from 'react';
import { useCartStore } from '@/stores/cartStore';
import { useAuthStore } from '@/stores/authStore';
import { useStoreConfigStore, APPOINTMENT_TYPES, WORK_ORDER_TYPES } from '@/stores/storeConfigStore';
import { useT } from '@/lib/i18n/client';
import type { StoreConfig, StorefrontConfig, NavLink } from '@xeboki/sdk';

interface Props {
  storeConfig: StoreConfig;
  storefrontConfig: StorefrontConfig | null;
  storeSlug: string;
}

export function StorefrontHeader({ storeConfig, storefrontConfig, storeSlug }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const itemCount = useCartStore((s) => s.itemCount());
  const customer = useAuthStore((s) => s.customer);
  const businessType = useStoreConfigStore((s) => s.businessType);
  const t = useT();

  const hasAppointments = APPOINTMENT_TYPES.has(businessType);
  const hasWorkOrders = WORK_ORDER_TYPES.has(businessType);
  const customNavLinks: NavLink[] = storefrontConfig?.navLinks ?? [];

  return (
    <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur border-b border-slate-200">
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
            <Link href={`/${storeSlug}/catalog`} className="text-slate-600 hover:text-primary transition-colors">
              {t('nav.shop')}
            </Link>
            {hasAppointments && (
              <Link href={`/${storeSlug}/book`} className="text-slate-600 hover:text-primary transition-colors">
                Book
              </Link>
            )}
            {hasWorkOrders && (
              <Link href={`/${storeSlug}/repairs`} className="text-slate-600 hover:text-primary transition-colors">
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
                className="text-slate-600 hover:text-primary transition-colors"
              >
                {link.label}
              </a>
            ))}

            {customer && (
              <Link href={`/${storeSlug}/account`} className="text-slate-600 hover:text-primary transition-colors">
                My Account
              </Link>
            )}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <Link
              href={`/${storeSlug}/catalog`}
              className="p-2 text-slate-600 hover:text-primary transition-colors"
              aria-label="Search"
            >
              <Search size={20} />
            </Link>

            {hasAppointments && (
              <Link
                href={`/${storeSlug}/book`}
                className="p-2 text-slate-600 hover:text-primary transition-colors hidden md:block"
                aria-label="Book appointment"
              >
                <Calendar size={20} />
              </Link>
            )}

            {customer && (
              <Link
                href={`/${storeSlug}/account/wishlist`}
                className="p-2 text-slate-600 hover:text-primary transition-colors"
                aria-label="Wishlist"
              >
                <Heart size={20} />
              </Link>
            )}

            {customer ? (
              <Link
                href={`/${storeSlug}/account`}
                className="p-2 text-slate-600 hover:text-primary transition-colors"
                aria-label="Account"
              >
                <User size={20} />
              </Link>
            ) : (
              <Link
                href={`/${storeSlug}/login`}
                className="hidden md:block text-sm font-medium text-slate-600 hover:text-primary transition-colors px-2"
              >
                {t('nav.signIn')}
              </Link>
            )}

            <Link
              href={`/${storeSlug}/cart`}
              className="relative p-2 text-slate-600 hover:text-primary transition-colors"
              aria-label="Cart"
            >
              <ShoppingCart size={20} />
              {itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
                  {itemCount > 9 ? '9+' : itemCount}
                </span>
              )}
            </Link>

            <button
              className="md:hidden p-2 text-slate-600"
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
        <div className="md:hidden border-t border-slate-200 bg-surface px-4 py-3 space-y-1">
          <Link href={`/${storeSlug}/catalog`} className="flex items-center gap-2 py-2.5 text-slate-700 font-medium" onClick={() => setMobileOpen(false)}>
            <Search size={16} className="text-slate-400" /> Shop
          </Link>
          {hasAppointments && (
            <Link href={`/${storeSlug}/book`} className="flex items-center gap-2 py-2.5 text-slate-700 font-medium" onClick={() => setMobileOpen(false)}>
              <Calendar size={16} className="text-slate-400" /> Book Appointment
            </Link>
          )}
          {hasWorkOrders && (
            <Link href={`/${storeSlug}/repairs`} className="flex items-center gap-2 py-2.5 text-slate-700 font-medium" onClick={() => setMobileOpen(false)}>
              <Wrench size={16} className="text-slate-400" /> Track Order
            </Link>
          )}
          {customer ? (
            <>
              <Link href={`/${storeSlug}/account`} className="flex items-center gap-2 py-2.5 text-slate-700 font-medium" onClick={() => setMobileOpen(false)}>
                <User size={16} className="text-slate-400" /> My Account
              </Link>
              <Link href={`/${storeSlug}/account/appointments`} className="flex items-center gap-2 py-2.5 text-slate-700 font-medium" onClick={() => setMobileOpen(false)}>
                <Calendar size={16} className="text-slate-400" /> My Appointments
              </Link>
            </>
          ) : (
            <Link href={`/${storeSlug}/login`} className="flex items-center gap-2 py-2.5 text-slate-700 font-medium" onClick={() => setMobileOpen(false)}>
              <User size={16} className="text-slate-400" /> Sign in
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
