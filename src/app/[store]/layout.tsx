import type { Metadata } from 'next';
import { storeName } from '@/lib/store-name';
import { notFound, redirect } from 'next/navigation';
import { loadStore, loadCategories, loadOffers, loadCustomPages } from '@/lib/sdk/store';

import { StoreProviders } from '@/components/layout/StoreProviders';
import { StorefrontHeader } from '@/components/layout/StorefrontHeader';
import { Marquee } from '@/components/layout/Marquee';
import { showSection } from '@/lib/sections';
import { StorefrontFooter } from '@/components/layout/StorefrontFooter';
import { PromoNotice } from '@/components/layout/PromoNotice';
import { ClosedForOrders } from '@/components/layout/ClosedForOrders';
import { withDesignPreview } from '@/lib/design-preview';
import { NotOpenYet } from '@/components/layout/NotOpenYet';
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

  // The back office's band preview: one band, drawn bare.
  //
  // Above both gates below, deliberately. A merchant arranges their page
  // BEFORE they open the shop, so a preview that respects "not open yet"
  // would be blank for exactly the person it is for — and one that respects
  // "members only" would send the editor's frame to a sign-in page.
  //
  // It is a fragment, not a page: no header, no footer, no providers, so
  // what the merchant sees in the dialog is the band and nothing else. The
  // theme still applies, because the root layout puts it on <html>.
  //
  // Nothing here is private. Every band on this route draws from the same
  // catalogue the shop's own front page shows a stranger.
  // `band-preview`, not `_band`: a folder whose name starts with an
  // underscore is PRIVATE to the Next router and never becomes a route at
  // all — the first version of this answered 404 and looked like a broken
  // layout. Custom pages live under `/p/`, so a plain segment here cannot
  // collide with a page a merchant made.
  const previewPath = headers().get('x-xeboki-path') ?? '';
  if (/\/band-preview(\/|$|\?)/.test(previewPath)) {
    return <>{children}</>;
  }

  // The merchant previewing their own page, with the shop's chrome on —
  // unlike the band preview above, which is a fragment. It skips the two
  // gates below for the same reason: a merchant arranges their page BEFORE
  // they open the shop, so a preview that respected "not open yet" would be
  // blank for exactly the person it is for, and one that respected "members
  // only" would send them to a sign-in page to look at their own work.
  //
  // Nothing is given away by skipping them: the page is only drawn at all
  // when the API accepts a preview token minted for this shop.
  const isOwnerPreview = /\/preview(\/|$|\?)/.test(previewPath);

  // A shop can put itself behind a sign-in. The switch has been on the
  // Overview tab since it shipped and read by nothing, so a trade-only shop
  // that asked for this was wide open.
  //
  // Switched off by the merchant. Gated here, above everything, because
  // "Enable Online Store — make your store visible to customers" only ever
  // reached `robots.ts` and the sitemap: a shop that had been switched off
  // was hidden from search engines and still answering 200 on its home page,
  // its catalogue AND its cart. Absent means published, so a shop that has
  // never opened the switch is untouched by this.
  if (resolved.storefrontConfig?.isPublished === false && !isOwnerPreview) {
    // No providers: the theme variables are set on <html> by the root
    // layout, so this is styled without a cart, a session or a catalogue
    // being loaded for a shop nobody is allowed into.
    return <NotOpenYet storeConfig={resolved.storeConfig} />;
  }

  // Gated in the LAYOUT, not on the catalogue: a guard that covers the listing
  // and leaves the product pages, the search and the sitemap open guards
  // nothing. The sign-in and register pages are the exception, or there is no
  // way in.
  if (resolved.storefrontConfig?.requireLoginToBrowse && !isOwnerPreview) {
    // `x-xeboki-path` is set by the middleware. The two Next internals this
    // used to read are not set in this version, so the path was always ''
    // and the sign-in page was gated along with everything else.
    const path = headers().get('x-xeboki-path')
      ?? headers().get('x-invoke-path') ?? headers().get('x-pathname') ?? '';
    const isWayIn = /\/(login|register)(\/|$)/.test(path);
    if (!isWayIn && !(await getSession())) {
      redirect(`/${params.store}/login`);
    }
  }

  const { storeConfig, slug } = resolved;
  // What the merchant is trying out, over what the shop has saved. The
  // header and the footer below are most of what the Design screen sets, so
  // they have to see it too — the theme alone would recolour a header that
  // was still in the old layout.
  const storefrontConfig = withDesignPreview(resolved.storefrontConfig);
  // Resolved from the shopper's choice, not just the deployment default —
  // the dictionaries have always been here, the switch has not.
  const locale = activeLocale();
  const locales = availableLocales();

  // The category rail is part of the header now, so the layout loads it once
  // instead of every page that wants to show categories.
  const categories = (await loadCategories(resolved.apiKey).catch(() => ({ data: [] }))).data ?? [];
  // What the shop is running, so the strip at the top can say it. Loaded
  // here, beside the rest of the header's data, rather than fetched by the
  // header itself — the header renders on the server and a client fetch
  // would announce the offer a beat after the page it sits on.
  const offers = await loadOffers(resolved.apiKey).catch(() => []);
  // The merchant's own pages, for the footer and the menu. Published only,
  // and in the order they dragged them into.
  const pages = (await loadCustomPages(resolved.apiKey, true)
    .catch(() => ({ data: [] }))).data ?? [];

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
      <StoreProviders slug={slug} storeConfig={storeConfig} storefrontConfig={storefrontConfig}>
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
            offers={offers}
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
            footerPages={pages
              .filter((page) => page.showInFooter)
              .map((page) => ({ slug: page.slug, title: page.title }))}
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
