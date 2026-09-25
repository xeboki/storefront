import type { Metadata } from 'next';
import { Inter, Lato, Playfair_Display, Poppins, Roboto } from 'next/font/google';
import { headers } from 'next/headers';
import Script from 'next/script';
import './globals.css';
import { loadStore } from '@/lib/sdk/store';
import { buildThemeVars } from '@/lib/theme';
import { activeLocale } from '@/lib/i18n/server';
import { ColorSchemeProvider, colorSchemeScript } from '@/components/layout/color-scheme';

/**
 * The shop's actual typefaces.
 *
 * `--font-sans: 'Inter'` was in the tokens from the start and Inter was never
 * loaded, so every storefront has been rendering in the browser's UI font —
 * which is why it read like an admin panel rather than a shop. Self-hosted
 * through next/font, so there is no layout shift and no request to Google at
 * runtime.
 *
 * A merchant's own font choice still wins: these are only what the presets
 * fall back to.
 */
const sans = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const display = Playfair_Display({
  subsets: ['latin'],
  display: 'swap',
  weight: ['500', '600', '700'],
  variable: '--font-playfair',
});

// The rest of what Manager's font picker offers. Only Inter was ever loaded,
// so a merchant choosing Poppins, Roboto or Lato got the browser's UI font and
// no hint that their choice had done nothing.
const poppins = Poppins({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
});

const roboto = Roboto({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '700'],
  variable: '--font-roboto',
});

const lato = Lato({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '700'],
  variable: '--font-lato',
});

const FONT_VARS = [display, poppins, roboto, lato].map((f) => f.variable).join(' ');

export const metadata: Metadata = {
  title: 'Xeboki Store',
  description: 'Powered by Xeboki',
};

/**
 * The only layout that renders <html> and <body>.
 *
 * The per-store layout used to render its own pair inside these, which is
 * invalid HTML — the browser collapsed them and React spent every navigation
 * warning that it was mounting a second <html>. The store's theme still has to
 * reach <html>, so it is resolved here from the slug the middleware puts on the
 * request headers.
 */
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const h = headers();
  const slug = h.get('x-store-slug');
  const resolved = slug ? await loadStore(slug).catch(() => null) : null;

  // `?theme=<preset>` (carried by the middleware, since a layout cannot read
  // searchParams) previews a preset without saving it — Manager links to it.
  const preview = h.get('x-xeboki-theme');
  const config = resolved?.storefrontConfig ?? null;
  const themeVars = buildThemeVars(
    preview && config ? { ...config, theme: preview } : config,
  );
  // The shopper's choice, not the deployment default — <html lang> is what a
  // screen reader and a translation tool read, so it has to agree with the
  // language the page is actually written in.
  const locale = activeLocale();

  return (
    <html
      lang={locale}
      className={`${sans.variable} ${FONT_VARS}`}
      style={themeVars as React.CSSProperties}
      // The pre-paint script adds `.dark` before React sees the document.
      suppressHydrationWarning
    >
      <body className="min-h-screen flex flex-col bg-bg text-fg">
        <Script
          id="xeboki-color-scheme"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: colorSchemeScript }}
        />
        <ColorSchemeProvider>{children}</ColorSchemeProvider>
      </body>
    </html>
  );
}
