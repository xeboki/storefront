import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { loadStore, loadCategories } from '@/lib/sdk/store';

import { StoreProviders } from '@/components/layout/StoreProviders';
import { StorefrontHeader } from '@/components/layout/StorefrontHeader';
import { StorefrontFooter } from '@/components/layout/StorefrontFooter';
import { generateOrganization } from '@/lib/seo/structured-data';
import { LocaleProvider } from '@/lib/i18n/client';
import { activeLocale, availableLocales } from '@/lib/i18n/server';
import { AnalyticsScripts } from '@/components/analytics/AnalyticsScripts';
import { activeLocation, needsStoreChoice, onlineStores } from '@/lib/location';
import { StoreGate } from '@/components/location/StoreGate';

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

  const titleTemplate = storefrontConfig?.seoTitleTemplate ?? `%s | ${storeConfig.businessName}`;

  return {
    title: {
      default: storefrontConfig?.seoTitle || storeConfig.businessName,
      template: titleTemplate,
    },
    description: storefrontConfig?.seoDescription || `Shop at ${storeConfig.businessName}`,
    openGraph: {
      siteName: storeConfig.businessName,
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
    robots: storefrontConfig?.isPublished
      ? { index: true, follow: true }
      : { index: false, follow: false },
  };
}

export default async function StoreLayout({ params, children }: Props) {
  const resolved = await loadStore(params.store);
  if (!resolved) notFound();

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
        ga4Id={storefrontConfig?.ga4MeasurementId}
        metaPixelId={storefrontConfig?.metaPixelId}
      />
      <StoreProviders slug={slug} apiKey={resolved.apiKey} storeConfig={storeConfig} storefrontConfig={storefrontConfig}>
          <LocaleProvider locale={locale}>
          {resolved.isTestMode && (
            <div style={{ background: '#F59E0B', color: '#000', textAlign: 'center', padding: '8px 16px', fontSize: '13px', fontWeight: 600, letterSpacing: '0.05em' }}>
              ⚠ TEST MODE — No real payments are processed. Use Stripe test cards only.
            </div>
          )}
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
              businessName={storeConfig.businessName}
            />
          )}
          <StorefrontFooter
            storeConfig={storeConfig}
            storefrontConfig={storefrontConfig}
            storeSlug={slug}
            paymentMethods={storeConfig.paymentMethods ?? []}
          />
          </LocaleProvider>
      </StoreProviders>
    </>
  );
}
