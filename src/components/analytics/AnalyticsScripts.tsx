/**
 * Loads a shop's tags — GA4, Meta Pixel, Google Tag Manager — and only those
 * it is actually allowed to load.
 *
 * It used to load a tag whenever an ID was present. The Analytics tab has had
 * an on/off switch per tag since it shipped and nothing read it, so a merchant
 * who switched tracking off and left the ID in the box — which is the normal
 * thing to do — went on tracking every shopper. That is a privacy defect
 * rather than a missing feature.
 *
 * The deployment-level env fallback was the worse half: `NEXT_PUBLIC_GA4_...`
 * applied to EVERY shop regardless of what any merchant had set, so a shop
 * that never configured analytics at all was still reporting. It is now only
 * a default for a shop that has no ID of its own, and it is still subject to
 * that shop's switch.
 *
 * Google Tag Manager was never loaded at all: the container id was written by
 * the Analytics tab and no tag manager existed in this codebase.
 */
import Script from 'next/script';
import type { AnalyticsSettings } from '@xeboki/sdk';

interface Props {
  analytics?: AnalyticsSettings | null;
}

export function AnalyticsScripts({ analytics }: Props) {
  if (!analytics) return null;

  // An ID from the deployment is a default for a shop that set none — never
  // an override of a shop that switched tracking off.
  const ga4 = analytics.ga4.enabled
    ? analytics.ga4.measurementId || process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID || ''
    : '';
  const pixel = analytics.meta.enabled
    ? analytics.meta.pixelId || process.env.NEXT_PUBLIC_META_PIXEL_ID || ''
    : '';
  const gtm = analytics.gtm.enabled ? analytics.gtm.containerId : '';

  return (
    <>
      {/* What each tag may report, read by `lib/analytics` at the moment of
          the event. A shop can measure its traffic without shipping basket
          contents to an ad network, which is what the per-event switches on
          the Analytics tab were always for. */}
      <Script id="xbk-analytics-consent" strategy="beforeInteractive">
        {`window.__xbkAnalytics=${JSON.stringify({
          ga4: Boolean(ga4),
          meta: Boolean(pixel),
          metaPurchases: analytics.meta.trackPurchases,
          metaAddToCart: analytics.meta.trackAddToCart,
        })};`}
      </Script>

      {gtm && (
        <Script id="gtm" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtm}');`}
        </Script>
      )}

      {ga4 && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${ga4}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga4}');`}
          </Script>
        </>
      )}

      {pixel && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixel}');fbq('track','PageView');`}
        </Script>
      )}
    </>
  );
}
