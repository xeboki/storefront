import type { Metadata } from 'next';
import {
  Caveat, Cormorant_Garamond, Dancing_Script, DM_Sans, DM_Serif_Display,
  Figtree, Great_Vibes, Inter, Lato, Libre_Baskerville, Lora, Montserrat,
  Pacifico, Parisienne, Playfair_Display, Poppins, Roboto, Sacramento,
  Space_Grotesk, Work_Sans,
} from 'next/font/google';
import { headers } from 'next/headers';
import Script from 'next/script';
import './globals.css';
import { loadStore } from '@/lib/sdk/store';
import { buildThemeVars } from '@/lib/theme';
import { direction } from '@/lib/i18n/dictionaries';
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
/**
 * Only these two are preloaded — they are what a store gets when it has chosen
 * nothing, so they are the pair most pages actually render.
 */
const sans = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' });

const display = Playfair_Display({
  subsets: ['latin'],
  display: 'swap',
  weight: ['500', '600', '700'],
  variable: '--font-playfair',
});

/**
 * The rest of Manager's font picker.
 *
 * `preload: false` matters more than it looks. next/font declares the
 * @font-face for every face here, but a browser only downloads a font once
 * something on the page is actually set in it — so a shop using two faces
 * fetches two, not fourteen. Preloading them all would put ~400KB of fonts in
 * front of every first paint to serve a choice the merchant may never make.
 *
 * Weights are explicit throughout: some of these are variable and some are
 * not, and naming them is the version that cannot break when Google changes
 * which is which.
 */
const poppins = Poppins({ subsets: ['latin'], display: 'swap', preload: false,
  weight: ['400', '500', '600', '700'], variable: '--font-poppins' });
const roboto = Roboto({ subsets: ['latin'], display: 'swap', preload: false,
  weight: ['400', '500', '700'], variable: '--font-roboto' });
const lato = Lato({ subsets: ['latin'], display: 'swap', preload: false,
  weight: ['400', '700'], variable: '--font-lato' });
const montserrat = Montserrat({ subsets: ['latin'], display: 'swap', preload: false,
  weight: ['400', '500', '600', '700'], variable: '--font-montserrat' });
const dmSans = DM_Sans({ subsets: ['latin'], display: 'swap', preload: false,
  weight: ['400', '500', '700'], variable: '--font-dm-sans' });
const workSans = Work_Sans({ subsets: ['latin'], display: 'swap', preload: false,
  weight: ['400', '500', '600'], variable: '--font-work-sans' });
const figtree = Figtree({ subsets: ['latin'], display: 'swap', preload: false,
  weight: ['400', '500', '600', '700'], variable: '--font-figtree' });
const dmSerif = DM_Serif_Display({ subsets: ['latin'], display: 'swap', preload: false,
  weight: ['400'], variable: '--font-dm-serif' });
const cormorant = Cormorant_Garamond({ subsets: ['latin'], display: 'swap', preload: false,
  weight: ['400', '500', '600', '700'], variable: '--font-cormorant' });
const baskerville = Libre_Baskerville({ subsets: ['latin'], display: 'swap', preload: false,
  weight: ['400', '700'], variable: '--font-baskerville' });
const lora = Lora({ subsets: ['latin'], display: 'swap', preload: false,
  weight: ['400', '500', '600', '700'], variable: '--font-lora' });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], display: 'swap', preload: false,
  weight: ['400', '500', '600', '700'], variable: '--font-space-grotesk' });

/**
 * For the shop's NAME, when it has no logo and the name is the mark.
 *
 * Their own group, not more entries in the display list, because a paragraph
 * set in any of them is unreadable — these are for four words at most. Most
 * ship a single weight, which is why the weights differ face to face rather
 * than being copied down the list.
 */
const dancingScript = Dancing_Script({ subsets: ['latin'], display: 'swap', preload: false,
  weight: ['400', '500', '600', '700'], variable: '--font-dancing-script' });
const greatVibes = Great_Vibes({ subsets: ['latin'], display: 'swap', preload: false,
  weight: ['400'], variable: '--font-great-vibes' });
const sacramento = Sacramento({ subsets: ['latin'], display: 'swap', preload: false,
  weight: ['400'], variable: '--font-sacramento' });
const pacifico = Pacifico({ subsets: ['latin'], display: 'swap', preload: false,
  weight: ['400'], variable: '--font-pacifico' });
const caveat = Caveat({ subsets: ['latin'], display: 'swap', preload: false,
  weight: ['400', '500', '600', '700'], variable: '--font-caveat' });
const parisienne = Parisienne({ subsets: ['latin'], display: 'swap', preload: false,
  weight: ['400'], variable: '--font-parisienne' });

// Each loader has to be its own module-scope const — next/font rejects a call
// inside an object literal, so the list is assembled afterwards.
const FONT_VARS = [
  display, poppins, roboto, lato, montserrat, dmSans, workSans, figtree,
  dmSerif, cormorant, baskerville, lora, spaceGrotesk,
  dancingScript, greatVibes, sacramento, pacifico, caveat, parisienne,
].map((f) => f.variable).join(' ');

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
      // Direction, not just language. Without it an Arabic or Hebrew shop
      // would read right to left inside a left-to-right page: the cart on
      // the wrong side, every chevron pointing away from the thing it opens.
      // `dir` is also what makes Tailwind's logical utilities (`ms-`, `pe-`,
      // `text-start`, `end-0`) mirror, which is what the components use.
      dir={direction(locale)}
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
