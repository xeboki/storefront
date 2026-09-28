import { NextResponse } from 'next/server';
import { loadStore } from '@/lib/sdk/store';
import { storeName } from '@/lib/store-name';
import { monogram } from '@/lib/monogram';
import { buildTheme } from '@/lib/theme';
import { embeddedFont } from '@/lib/embedded-font';

/**
 * The shop's mark as an image, for the browser tab.
 *
 * `faviconUrl` has been in the config, the API response and the SDK type since
 * the CMS shipped, and nothing read it — a merchant uploaded a favicon and the
 * tab went on showing the framework's default. Now it is used when it is set,
 * and when it is not the tab gets the same monogram the header and footer
 * carry rather than nothing at all.
 *
 * SVG rather than a rendered PNG: it is a letter on a coloured square, it
 * costs no image pipeline, and it stays sharp on a high-density screen.
 */
export async function GET(
  _request: Request,
  { params }: { params: { store: string } },
) {
  const resolved = await loadStore(params.store);
  if (!resolved) return new NextResponse('Not found', { status: 404 });

  const { storeConfig, storefrontConfig } = resolved;
  const name = storeName(storeConfig);
  const letter = monogram(name);

  // The same brand colour the shop is painted in — read through the theme so
  // the preset's fallback applies when the merchant has set no colour.
  const vars = buildTheme(storefrontConfig).vars;
  const bg = `rgb(${vars['--l-primary']})`;
  const fg = `rgb(${vars['--l-primary-fg']})`;

  // The same lockup the header draws: a squircle, light falling across it, a
  // hairline edge so it keeps its shape against a dark browser chrome, and the
  // letter in the shop's own heading face.
  //
  // The face has to travel INSIDE the image. A favicon is rendered in an
  // isolated context that fetches no stylesheet and no web font, so naming the
  // family only worked for a viewer who happened to have it installed — which
  // is nobody, so every shop's tab fell back to Georgia while the header
  // beside it showed the merchant's actual choice. `embeddedFont` subsets the
  // face to the one letter drawn, which costs a couple of kilobytes, and
  // returns nothing at all rather than failing: the fallback stack still
  // renders a mark.
  const face = (storefrontConfig?.headingFont || '').trim();
  const inline = await embeddedFont(face, letter, 600);
  const stack = [inline.family || (face && `'${face.replace(/'/g, '')}'`),
                 'Georgia', "'Times New Roman'", 'serif']
    .filter(Boolean)
    .join(', ');
  const safeName = name.replace(/[<>&"]/g, '');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="${safeName}">
  <defs>
    <style>${inline.css}</style>
    <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity="0.30"/>
      <stop offset="0.5" stop-color="#fff" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity="0.25"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="22" fill="${bg}"/>
  <rect width="64" height="64" rx="22" fill="url(#sheen)"/>
  <rect x="0.75" y="0.75" width="62.5" height="62.5" rx="21.25"
        fill="none" stroke="#fff" stroke-opacity="0.22" stroke-width="1.5"/>
  <text x="32" y="34" fill="${fg}" font-family="${stack}"
        font-size="36" font-weight="600" text-anchor="middle"
        dominant-baseline="central">${letter}</text>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      // A shop's mark changes when its owner changes it, which is rarely.
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}
