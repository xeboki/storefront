import Link from 'next/link';
import type { StoreConfig, StorefrontConfig } from '@xeboki/sdk';

interface Props {
  storeConfig: StoreConfig;
  storefrontConfig: StorefrontConfig | null;
  storeSlug: string;
}

export function StorefrontFooter({ storeConfig, storefrontConfig, storeSlug }: Props) {
  const year = new Date().getFullYear();

  const footerColumns = storefrontConfig?.footerColumns ?? [];
  const socialLinks   = storefrontConfig?.socialLinks ?? {};
  const hasSocial     = Object.keys(socialLinks).length > 0;

  // Built-in columns shown when merchant hasn't configured custom footer columns
  const showBuiltIn = footerColumns.length === 0;

  return (
    <footer className="border-t border-slate-200 bg-muted mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">

          {/* Brand column — always shown */}
          <div className="md:col-span-1">
            <h3 className="font-bold text-slate-900 mb-3">{storeConfig.businessName}</h3>
            {storeConfig.supportPhone && (
              <p className="text-sm text-slate-500">{storeConfig.supportPhone}</p>
            )}
            {storeConfig.supportEmail && (
              <a href={`mailto:${storeConfig.supportEmail}`} className="text-sm text-slate-500 hover:text-primary transition-colors">
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
                    className="text-xs text-slate-400 hover:text-primary transition-colors capitalize font-medium"
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
              <h4 className="font-semibold text-slate-700 mb-3">{col.heading}</h4>
              <ul className="space-y-2 text-sm text-slate-500">
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
                <h4 className="font-semibold text-slate-700 mb-3">Shop</h4>
                <ul className="space-y-2 text-sm text-slate-500">
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
                <h4 className="font-semibold text-slate-700 mb-3">Account</h4>
                <ul className="space-y-2 text-sm text-slate-500">
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

        <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© {year} {storeConfig.businessName}. All rights reserved.</p>
          <p>Powered by <span className="font-semibold text-slate-500">Xeboki</span></p>
        </div>
      </div>
    </footer>
  );
}
