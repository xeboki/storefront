'use client';

/**
 * The phone's primary navigation, pinned to the bottom.
 *
 * Everything but the logo used to live behind one hamburger, so Shop, Saved
 * and the cart were each two taps away and none of them was visible. A bottom
 * bar puts them under the thumb, which is the half of the screen a hand can
 * actually reach.
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { Home, Menu, Search, ShoppingCart, Heart } from 'lucide-react';
import { useCartStore } from '@/stores/cartStore';
import { useT } from '@/lib/i18n/client';
import { useHydrated } from '@/lib/use-hydrated';

interface Props {
  storeSlug: string;
  onOpenMenu: () => void;
}

export function MobileTabBar({ storeSlug, onOpenMenu }: Props) {
  const pathname = usePathname() ?? '';
  const t = useT();
  const hydrated = useHydrated();
  const itemCount = useCartStore((s) => s.itemCount());

  const base = `/${storeSlug}`;
  const tabs = [
    { href: base, label: t('nav.home'), Icon: Home, match: (p: string) => p === base },
    { href: `${base}/catalog`, label: t('nav.shop'), Icon: Search, match: (p: string) => p.startsWith(`${base}/catalog`) || p.startsWith(`${base}/product`) },
    { href: `${base}/account/wishlist`, label: t('nav.wishlist'), Icon: Heart, match: (p: string) => p.startsWith(`${base}/account/wishlist`) },
    { href: `${base}/cart`, label: t('nav.cart'), Icon: ShoppingCart, match: (p: string) => p.startsWith(`${base}/cart`) },
  ];

  return (
    <nav
      aria-label="Primary"
      className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="flex items-stretch">
        {tabs.map(({ href, label, Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={clsx(
                  'flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors',
                  active ? 'text-primary' : 'text-fg-muted',
                )}
              >
                <span className="relative">
                  <Icon size={20} aria-hidden />
                  {/* Cart count comes from localStorage, so it waits for
                      hydration or the server and client disagree. */}
                  {href.endsWith('/cart') && hydrated && itemCount > 0 && (
                    <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-solid px-1 text-[10px] font-bold text-primary-foreground">
                      {itemCount > 9 ? '9+' : itemCount}
                    </span>
                  )}
                </span>
                {label}
              </Link>
            </li>
          );
        })}
        <li className="flex-1">
          <button
            type="button"
            onClick={onOpenMenu}
            className="flex h-14 w-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-fg-muted transition-colors"
          >
            <Menu size={20} aria-hidden />
            {t('nav.menu')}
          </button>
        </li>
      </ul>
    </nav>
  );
}
