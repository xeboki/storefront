/**
 * A web font, as bytes, for a context that cannot fetch one.
 *
 * An SVG used as a favicon is rendered in isolation: the browser will not load
 * a stylesheet or a web font for it, so `font-family: 'Cormorant Garamond'`
 * resolves only if the viewer happens to have that face installed. Nobody
 * does, so every shop's tab mark quietly fell back to Georgia — the one place
 * the merchant's chosen face was named and the only place it could not arrive.
 *
 * The fix is to carry the font inside the image. Google Fonts will subset to
 * exactly the characters asked for via `text=`, so a one-letter monogram costs
 * a couple of kilobytes rather than the whole face.
 *
 * Never throws: a mark in the fallback serif is better than no mark at all.
 */

/** Per-process, keyed by family + the glyphs wanted. Fonts do not change. */
const cache = new Map<string, string | null>();

/** Chrome's UA string, because the CSS endpoint serves woff2 only to a UA it
 * recognises — ask as anything else and it answers with ttf, which is an order
 * of magnitude larger for the same glyphs. */
const MODERN_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export interface EmbeddedFont {
  /** An `@font-face` rule with the bytes inline, or '' when unavailable. */
  css: string;
  /** The family to name in `font-family`, already quoted. */
  family: string;
}

/**
 * Fetch [family] subset to [text] and return it as an inline `@font-face`.
 *
 * [weight] has to match what the mark draws with, or the browser synthesises a
 * bold from the regular and the letterform is not the merchant's face either.
 */
export async function embeddedFont(
  family: string,
  text: string,
  weight = 600,
): Promise<EmbeddedFont> {
  const clean = family.trim().replace(/['"]/g, '');
  if (!clean || !text) return { css: '', family: '' };

  const key = `${clean}|${weight}|${text}`;
  if (!cache.has(key)) {
    cache.set(key, await load(clean, text, weight));
  }
  const dataUri = cache.get(key);
  if (!dataUri) return { css: '', family: '' };

  return {
    family: `'${clean}'`,
    css: `@font-face{font-family:'${clean}';font-style:normal;` +
      `font-weight:${weight};src:url(${dataUri}) format('woff2');}`,
  };
}

async function load(
  family: string,
  text: string,
  weight: number,
): Promise<string | null> {
  try {
    const url =
      'https://fonts.googleapis.com/css2?family=' +
      encodeURIComponent(family.replace(/\s+/g, ' ')).replace(/%20/g, '+') +
      `:wght@${weight}&text=${encodeURIComponent(text)}&display=swap`;

    const css = await fetch(url, {
      headers: { 'User-Agent': MODERN_UA },
      // A font for a favicon is not worth holding a request open.
      signal: AbortSignal.timeout(4000),
      next: { revalidate: 86400 },
    }).then((r) => (r.ok ? r.text() : ''));

    // Match on the DECLARED format, not on the file extension: a subset URL
    // is `/l/font?kit=…` with no extension at all, so an extension-matching
    // pattern found nothing and the mark silently kept its fallback serif.
    const src = /url\((https:\/\/[^)]+)\)\s*format\(['"]woff2['"]\)/.exec(css)?.[1];
    if (!src) return null;

    const bytes = await fetch(src, {
      signal: AbortSignal.timeout(4000),
      next: { revalidate: 86400 },
    }).then((r) => (r.ok ? r.arrayBuffer() : null));
    if (!bytes) return null;

    // A subset of one or two glyphs is a couple of KB. Anything much larger
    // means the subsetting did not happen, and a favicon is not the place to
    // inline a whole typeface.
    if (bytes.byteLength > 200_000) return null;

    const base64 = Buffer.from(bytes).toString('base64');
    return `data:font/woff2;base64,${base64}`;
  } catch {
    return null;
  }
}
