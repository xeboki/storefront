import type { Metadata } from 'next';
import { storeName } from '@/lib/store-name';
import { notFound, redirect } from 'next/navigation';
import { loadStore, loadCategories } from '@/lib/sdk/store';

import { StoreProviders } from '@/components/layout/StoreProviders';
import { StorefrontHeader } from '@/components/layout/StorefrontHeader';
import { Marquee } from '@/components/layout/Marquee';
import { showSection } from '@/lib/sections';
import { StorefrontFooter } from '@/components/layout/StorefrontFooter';
import { PromoNotice } from '@/components/layout/PromoNotice';
import { ClosedForOrders } from '@/components/layout/ClosedForOrders';
import { AgeNotice } from '@/components/layout/AgeNotice';
import { generateOrganization } from '@/lib/seo/structured-data';
import { LocaleProvider } from '@/lib/i18n/client';
import { activeLocale, availableLocales } from '@/lib/i18n/server';
import { AnalyticsScripts } from '@/components/analytics/AnalyticsScripts';
import { activeLocation, needsStoreChoice, onlineStores } from '@/lib/location';
import { StoreGate } from '@/components/location/StoreGate';
import { headers } from 'next/headers';
import { getSession } from '@/lib/auth/session';

interface Props {
  params: { store: string };
  children: React.ReactNode;
}

export async function generateMetadata({ params }: { params: { store: string } }): Promise<Metadata> {
  const resolved = await loadStore(params.store);
  if (!resolved) return { title: 'Store Not Found' };

  const { storeConfig, storefrontConfig } = resolved;

  const ogImages: string[] = [];
  if (storefrontConfig?.seoOgImageUrl) ogImages.push(storefrontConfig.seoOgImageUrl);
  else if (storefrontConfig?.logoUrl) ogImages.push(storefrontConfig.logoUrl);

  const titleTemplate = storefrontConfig?.seoTitleTemplate ?? `%s | ${storeName(storeConfig)}`;

  // The merchant's favicon if they uploaded one — it has been in the config
  // since the CMS shipped and nothing read it — and otherwise the shop's
  // monogram, so the tab carries the same mark as the header.
  const icon = storefrontConfig?.faviconUrl || `/${params.store}/brandmark`;

  return {
    title: {
      default: storefrontConfig?.seoTitle || storeName(storeConfig),
      template: titleTemplate,
    },
    description: storefrontConfig?.seoDescription || `Shop at ${storeName(storeConfig)}`,
    openGraph: {
      siteName: storeName(storeConfig),
      images: ogImages,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      images: ogImages,
    },
    ...(storefrontConfig?.googleVerificationCode && {
      verification: { google: storefrontConfig.googleVerificationCode },
    }),
    icons: { icon, shortcut: icon, apple: icon },
    robots: storefrontConfig?.isPublished
      ? { index: true, follow: true }
      : { index: false, follow: false },
  };
}

export default async function StoreLayout({ params, children }: Props) {
  const resolved = await loadStore(params.store);
  if (!resolved) notFound();

  // A shop can put itself behind a sign-in. The switch has been on the
  // Overview tab since it shipped and read by nothing, so a trade-only shop
  // that asked for this was wide open.
  //
  // Gated in the LAYOUT, not on the catalogue: a guard that covers the listing
  // and leaves the product pages, the search and the sitemap open guards
  // nothing. The sign-in and register pages are the exception, or there is no
  // way in.
  if (resolved.storefrontConfig?.requireLoginToBrowse) {
    const path = headers().get('x-invoke-path') ?? headers().get('x-pathname') ?? '';
    const isWayIn = /\/(login|register)(\/|$)/.test(path);
    if (!isWayIn && !(await getSession())) {
      redirect(`/${params.store}/login`);
    }
  }

  const { storeConfig, storefrontConfig, slug } = resolved;
  // Resolved from the shopper's choice, not just the deployment default —
  // the dictionaries have always been here, the switch has not.
  const locale = activeLocale();
  const locales = availableLocales();

  // The category rail is part of the header now, so the layout loads it once
  // instead of every page that wants to show categories.
  const categories = (await loadCategories(resolved.apiKey).catch(() => ({ data: [] }))).data ?? [];

  // Resolved once per request and handed down, so the header, the catalog, the
  // product page and checkout cannot disagree about which store this is.
  const stores = onlineStores(storefrontConfig);
  const activeStore = activeLocation(storefrontConfig);
  // Nobody has picked yet and the branch decides what is for sale: ask before
  // they browse a shop that may not be theirs.
  const mustChooseStore = needsStoreChoice(storefrontConfig);

  const orgJsonLd = storefrontConfig?.structuredDataEnabled
    ? generateOrganization(slug, storeConfig, storefrontConfig)
    : null;

  return (
    <>
      {orgJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
      )}
      <AnalyticsScripts
        analytics={storefrontConfig?.analytics}
      />
      <StoreProviders slug={slug} apiKey={resolved.apiKey} storeConfig={storeConfig} storefrontConfig={storefrontConfig}>
          <LocaleProvider locale={locale}>
          {resolved.isTestMode && (
            <div style={{ background: '#F59E0B', color: '#000', textAlign: 'center', padding: '8px 16px', fontSize: '13px', fontWeight: 600, letterSpacing: '0.05em' }}>
              ⚠ TEST MODE — No real payments are processed. Use Stripe test cards only.
            </div>
          )}
          {showSection(storefrontConfig, 'announcement') && (
            <Marquee announcement={storefrontConfig?.announcement} />
          )}
          {/* Said once, at the top. A shopper should not discover a shop is
              closed at the end of a checkout they have already filled in. */}
          <ClosedForOrders shown={storefrontConfig?.acceptOnlineOrders === false} />
          {/* On every page, and not from the home page's band list — see
              AgeNotice. */}
          <AgeNotice
            businessType={storeConfig.businessType}
            wording={storefrontConfig?.ageNotice}
          />

          <StorefrontHeader
            storeConfig={storeConfig}
            storefrontConfig={storefrontConfig}
            storeSlug={slug}
            stores={activeStore ? stores : []}
            activeLocationId={activeStore?.locationId ?? null}
            categories={categories}
            locales={locales}
            locale={locale}
          />
          <main className="flex-1">{children}</main>
          {mustChooseStore && (
            <StoreGate
              stores={stores}
              storeSlug={slug}
              businessName={storeName(storeConfig)}
            />
          )}
          <StorefrontFooter
            storeConfig={storeConfig}
            storefrontConfig={storefrontConfig}
            storeSlug={slug}
            paymentMethods={storeConfig.paymentMethods ?? []}
          />
          {/* Last in the tree, so it sits over the whole shop. It draws
              nothing unless the merchant switched it on AND gave it words. */}
          {storefrontConfig?.promoPopup && (
            <PromoNotice popup={storefrontConfig.promoPopup} storeSlug={slug} />
          )}
          </LocaleProvider>
      </StoreProviders>
    </>
  );
}
