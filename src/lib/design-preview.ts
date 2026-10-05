import { headers } from 'next/headers';
import type { StorefrontConfig } from '@xeboki/sdk';

/**
 * Design settings the merchant is trying out but has not saved.
 *
 * The back office sets a shop's colours, faces and header blind: it has a
 * type specimen and a row of colour swatches, and nothing that shows the
 * shop. So it frames the shop itself and sends what is on the form, which is
 * not yet in the database — the page has to be told.
 *
 * The same shape as the `?theme=` preview that has been here since the theme
 * presets shipped, and for the same reasons:
 *
 *   * it travels as a REQUEST HEADER, because a layout cannot read
 *     `searchParams` and both layouts need it;
 *   * it is VISUAL ONLY and never persisted — nothing here reaches a
 *     database, an order or another shopper;
 *   * so it is safe to leave open. The worst a crafted link can do is show
 *     the person holding it a differently coloured version of a public page.
 *
 * Unknown keys are dropped rather than spread, so a back office newer than
 * this deployment cannot inject fields the storefront has no meaning for.
 */

/** Only what the Design screen actually sets. */
const ALLOWED = new Set<keyof StorefrontConfig>([
  'theme', 'primaryColor', 'secondaryColor', 'backgroundColor',
  'backgroundCustom', 'font', 'headingFont', 'wordmarkFont', 'wordmarkTagline',
  'logoUrl', 'typography', 'headerSettings', 'footerTagline',
  'footerShowSocial', 'footerShowAddress',
] as (keyof StorefrontConfig)[]);

export function designOverrides(): Partial<StorefrontConfig> | null {
  const raw = headers().get('x-xeboki-design');
  if (!raw) return null;
  try {
    // Percent-encoded on the way in: a header is a ByteString and a shop's
    // own words are not.
    const parsed = JSON.parse(decodeURIComponent(raw));
    if (!parsed || typeof parsed !== 'object') return null;
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (ALLOWED.has(key as keyof StorefrontConfig) && value !== null) {
        out[key] = value;
      }
    }
    return Object.keys(out).length ? (out as Partial<StorefrontConfig>) : null;
  } catch {
    // A half-typed override arrives on every keystroke in the editor. It
    // draws the shop as it is rather than failing the page.
    return null;
  }
}

/** The shop's config with whatever is being tried out laid over it. */
export function withDesignPreview(
  config: StorefrontConfig | null,
): StorefrontConfig | null {
  const overrides = designOverrides();
  if (!config || !overrides) return config;
  return { ...config, ...overrides };
}
