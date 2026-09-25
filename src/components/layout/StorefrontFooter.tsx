import Link from 'next/link';
import { storeName } from '@/lib/store-name';
import { ColorSchemeToggle } from './ColorSchemeToggle';
import { MapPin } from 'lucide-react';
import { sectionWords } from '@/lib/section-copy';
import { showSection } from '@/lib/sections';
import type { StoreConfig, StorefrontConfig, StorePaymentMethod } from '@xeboki/sdk';

interface Props {
  storeConfig: StoreConfig;
  storefrontConfig: StorefrontConfig | null;
  storeSlug: string;
  /** What checkout will actually accept. Named, never guessed. */
  paymentMethods?: StorePaymentMethod[];
}

export function StorefrontFooter({
  storeConfig, storefrontConfig, storeSlug, paymentMethods = [],
}: Props) {
  const year = new Date().getFullYear();

  // The closing band is a band like the ones on the home page, so its words
  // come from the same place. 'Come and see it in person' is not true for a
  // shop that only ships.
  const closing = sectionWords(storefrontConfig, 'footerCta', {
    eyebrow: 'Visit',
    title: 'Come and see it in person',
    linkLabel: 'Store locations',
  });

  const footerColumns = storefrontConfig?.footerColumns ?? [];
  const socialLinks   = storefrontConfig?.socialLinks ?? {};
  // Three settings the Design screen has always written and this footer has
  // never read: the tagline, and the two switches for social and the address.
  // Absent means on, which is what the CMS shows a merchant by default.
  const showSocial    = storefrontConfig?.footerShowSocial !== false;
  const hasSocial     = showSocial && Object.keys(socialLinks).length > 0;
  const tagline       = (storefrontConfig?.footerTagline || '').trim();

  // The shop's own address, when it is worth printing. A record with nothing
  // but a postcode in it is not — it reads as a data-entry accident.
  const addr = (storeConfig.address ?? {}) as Record<string, unknown>;
  const addressLine = [addr.street, addr.city, addr.state, addr.zip_code, addr.country]
    .map((part) => String(part ?? '').trim())
    .filter(Boolean)
    .join(', ');
  const showAddress = storefrontConfig?.footerShowAddress !== false
    && Boolean(String(addr.street ?? '').trim() || String(addr.city ?? '').trim());

  // Built-in columns shown when merchant hasn't configured custom footer columns
  const showBuiltIn = footerColumns.length === 0;

  return (
    // `bg-muted` survived the token migration as a class name that no longer
    // resolves, so the footer has been rendering with no background at all.
    // No top margin: every band above already ends on its own bottom padding, and
    // 96px on top of that put 152px of nothing between the last line of the page
    // and the footer. The border and the footer's own padding separate it.
    <footer className="border-t border-line bg-surface-alt/40">
      {/* A closing line before the housekeeping — the page needs somewhere to
          land rather than stopping at the last product. */}
      {showSection(storefrontConfig, 'footerCta') && (
      <div className="border-b border-line">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 sm:py-14 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div>
            {closing.eyebrow && (
              <p className="eyebrow eyebrow-rule text-primary">{closing.eyebrow}</p>
            )}
            <h2 className="display-lg mt-3 max-w-lg text-fg">{closing.title}</h2>
            {closing.lede && (
              <p className="mt-3 max-w-lg text-fg-muted">{closing.lede}</p>
            )}
          </div>
          <Link
            href={`/${storeSlug}/locations`}
            className="group inline-flex flex-shrink-0 items-center gap-2 border-b border-fg/30 pb-1 text-sm font-semibold uppercase tracking-[0.12em] text-fg transition-colors hover:border-primary hover:text-primary"
          >
            <MapPin size={15} />
            {closing.linkLabel}
          </Link>
        </div>
      </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">

          {/* Brand column — always shown */}
          <div className="md:col-span-1">
            <h3 className="font-bold text-fg mb-3">{storeName(storeConfig)}</h3>
            {tagline && (
              <p className="mb-3 max-w-xs text-sm leading-relaxed text-fg-muted">{tagline}</p>
            )}
            {showAddress && (
              <p className="mb-3 max-w-xs text-sm leading-relaxed text-fg-muted">{addressLine}</p>
            )}
            {storeConfig.supportPhone && (
              <p className="text-sm text-fg-muted">{storeConfig.supportPhone}</p>
            )}
            {storeConfig.supportEmail && (
              <a href={`mailto:${storeConfig.supportEmail}`} className="text-sm text-fg-muted hover:text-primary transition-colors">
                {storeConfig.supportEmail}
              </a>
            )}

            {/* Social links */}
            {hasSocial && (
              <div className="flex flex-wrap gap-3 mt-4">
                {Object.entries(socialLinks).map(([platform, url]) => (
                  <a
                    key={platform}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-fg-subtle hover:text-primary transition-colors capitalize font-medium"
                  >
                    {platform}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Dynamic merchant-configured footer columns */}
          {footerColumns.map((col) => (
            <div key={col.heading}>
              <h4 className="font-semibold text-fg mb-3">{col.heading}</h4>
              <ul className="space-y-2 text-sm text-fg-muted">
                {col.links.map((link) => (
                  <li key={link.url}>
                    <a
                      href={link.url}
                      target={link.openInNewTab ? '_blank' : undefined}
                      rel={link.openInNewTab ? 'noopener noreferrer' : undefined}
                      className="hover:text-primary transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Built-in fallback columns when no merchant config */}
          {showBuiltIn && (
            <>
              <div>
                <h4 className="font-semibold text-fg mb-3">Shop</h4>
                <ul className="space-y-2 text-sm text-fg-muted">
                  <li>
                    <Link href={`/${storeSlug}/catalog`} className="hover:text-primary transition-colors">
                      All Products
                    </Link>
                  </li>
                  <li>
                    <Link href={`/${storeSlug}/blog`} className="hover:text-primary transition-colors">
                      Blog
                    </Link>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-fg mb-3">Account</h4>
                <ul className="space-y-2 text-sm text-fg-muted">
                  <li>
                    <Link href={`/${storeSlug}/account`} className="hover:text-primary transition-colors">
                      My Orders
                    </Link>
                  </li>
                  <li>
                    <Link href={`/${storeSlug}/account/addresses`} className="hover:text-primary transition-colors">
                      Addresses
                    </Link>
                  </li>
                </ul>
              </div>
            </>
          )}
        </div>

        {/* What checkout actually accepts, from the merchant's own payment
            config — never a row of card logos we cannot honour. */}
        {paymentMethods.length > 0 && (
          <div className="mt-12 flex flex-wrap items-center gap-2 border-t border-line pt-8">
            <span className="eyebrow mr-2 text-[10px]">We accept</span>
            {paymentMethods.map((method) => (
              <span
                key={method.key}
                className="rounded-brand-sm border border-line px-2.5 py-1 text-xs text-fg-muted"
              >
                {method.label}
              </span>
            ))}
          </div>
        )}

        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-line pt-6 text-xs text-fg-subtle sm:flex-row">
          <p>© {year} {storeName(storeConfig)}. All rights reserved.</p>
          <div className="flex items-center gap-4">
            {/* Appearance belongs with the other housekeeping, not in the
                header taking room from search and the cart. */}
            <ColorSchemeToggle compact />
            <p>Powered by <span className="font-semibold text-fg-muted">Xeboki</span></p>
          </div>
        </div>
      </div>
    </footer>
  );
}
