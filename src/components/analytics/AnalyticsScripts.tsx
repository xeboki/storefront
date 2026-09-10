/**
 * Injects GA4 (gtag) and Meta Pixel tags when the store has ids configured.
 * Ids come from the store's StorefrontConfig, falling back to deployment env.
 * Renders nothing when neither is set — no empty tags, no console noise.
 *
 * Consent: this loads the tags unconditionally when configured. A full consent
 * mode / CMP gate is tracked as a P2 item; wire it here when required by region.
 */
import Script from 'next/script';

interface Props {
  ga4Id?: string | null;
  metaPixelId?: string | null;
}

export function AnalyticsScripts({ ga4Id, metaPixelId }: Props) {
  const ga4 = ga4Id || process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID || '';
  const pixel = metaPixelId || process.env.NEXT_PUBLIC_META_PIXEL_ID || '';

  return (
    <>
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
