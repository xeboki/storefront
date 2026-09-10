import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Script from 'next/script';
import { loadStore } from '@/lib/sdk/store';
import { buildThemeVars, themeVarsToStyle } from '@/lib/theme';
import { StoreProviders } from '@/components/layout/StoreProviders';
import { StorefrontHeader } from '@/components/layout/StorefrontHeader';
import { StorefrontFooter } from '@/components/layout/StorefrontFooter';
import { generateOrganization } from '@/lib/seo/structured-data';
import { AnalyticsScripts } from '@/components/analytics/AnalyticsScripts';

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
  // themeVars is already a { '--color-*': value } object — the shape React's
  // style prop wants. Passing the semicolon-joined string form (via
  // themeVarsToStyle) crashed every store page: React's style prop rejects a
  // string at runtime, cast or no cast.
  const themeVars = buildThemeVars(storefrontConfig);

  const orgJsonLd = storefrontConfig?.structuredDataEnabled
    ? generateOrganization(slug, storeConfig, storefrontConfig)
    : null;

  return (
    <html lang="en" style={themeVars as React.CSSProperties}>
      <head>
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
      </head>
      <body className="min-h-screen flex flex-col bg-white">
        <StoreProviders slug={slug} apiKey={resolved.apiKey} storeConfig={storeConfig} storefrontConfig={storefrontConfig}>
          {resolved.isTestMode && (
            <div style={{ background: '#F59E0B', color: '#000', textAlign: 'center', padding: '8px 16px', fontSize: '13px', fontWeight: 600, letterSpacing: '0.05em' }}>
              ⚠ TEST MODE — No real payments are processed. Use Stripe test cards only.
            </div>
          )}
          <StorefrontHeader
            storeConfig={storeConfig}
            storefrontConfig={storefrontConfig}
            storeSlug={slug}
          />
          <main className="flex-1">{children}</main>
          <StorefrontFooter storeConfig={storeConfig} storefrontConfig={storefrontConfig} storeSlug={slug} />
        </StoreProviders>
      </body>
    </html>
  );
}
