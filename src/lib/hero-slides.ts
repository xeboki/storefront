import type { HeroSlide, StoreConfig, StorefrontConfig } from '@xeboki/sdk';
import { storeName } from './store-name';
import { showSection } from './sections';

/**
 * Which banners this shop shows right now.
 *
 * Kept out of the component and free of React so the two things that are easy
 * to get wrong here can be tested: what a shop that has never heard of slides
 * shows, and what happens when every campaign has expired.
 */

/** A slide with its links already resolved against this store's prefix. */
export interface ResolvedSlide extends HeroSlide {
  ctaHref: string;
  secondaryCtaHref: string;
  /** Whether the second button is drawn at all. */
  showSecondary: boolean;
}

/** How long each banner stays up, in milliseconds. 0 means it does not move. */
export const INTERVAL_MS: Record<string, number> = {
  off: 0,
  slow: 9000,
  normal: 5000,
  fast: 3000,
};

/**
 * A link a merchant typed, resolved inside this store.
 *
 * A relative path stays within the store prefix — a merchant typing "/catalog"
 * means their catalogue, not the site root. The Design screen also shipped
 * with '/products' pre-filled while nothing read the field, so every shop that
 * saved it without editing holds a link to a page this storefront does not
 * have.
 */
export function inStore(url: string, storeSlug: string, fallback: string): string {
  const trimmed = (url || '').trim();
  if (!trimmed) return fallback;
  if (/^(https?:)?\/\//.test(trimmed) || trimmed.startsWith('mailto:') || trimmed.startsWith('tel:')) {
    return trimmed;
  }
  const path = trimmed.replace(/^\/+/, '');
  return `/${storeSlug}/${path === 'products' ? 'catalog' : path}`;
}

/**
 * Is this slide live at [now]?
 *
 * Blank means always, and an unparseable date means always rather than never:
 * a typo in a date field must not silently remove a merchant's banner.
 *
 * Evaluated where the page is rendered, so it is only as fresh as the page.
 * The storefront holds its config for five minutes, which is the accuracy a
 * merchant gets on "this sale ends at midnight" — worth knowing, and far
 * better than a banner nobody takes down.
 */
export function isLive(slide: Pick<HeroSlide, 'startsAt' | 'endsAt'>, now: Date): boolean {
  const at = (value: string): number | null => {
    if (!value) return null;
    const ms = Date.parse(value);
    return Number.isNaN(ms) ? null : ms;
  };
  const from = at(slide.startsAt);
  const until = at(slide.endsAt);
  const t = now.getTime();
  if (from !== null && t < from) return false;
  if (until !== null && t > until) return false;
  return true;
}

/** The single banner built from the original `hero*` fields. */
function legacySlide(
  config: StorefrontConfig | null,
  storeConfig: StoreConfig,
): HeroSlide {
  return {
    id: 'hero',
    imageUrl: config?.heroImageUrl || '',
    eyebrow: storeName(storeConfig),
    title: config?.heroTitle || storeName(storeConfig),
    titleSize: 'large',
    subtitle: config?.heroSubtitle || 'Shop our latest products',
    ctaText: (config?.heroCtaText || '').trim() || 'Shop now',
    ctaUrl: config?.heroCtaUrl || '',
    secondaryCtaText: (config?.heroSecondaryCtaText || '').trim() || 'Find a store',
    secondaryCtaUrl: config?.heroSecondaryCtaUrl || '',
    align: 'left',
    vertical: 'middle',
    alignMobile: 'left',
    overlay: 'medium',
    startsAt: '',
    endsAt: '',
  };
}

export function resolveSlides(
  config: StorefrontConfig | null,
  storeConfig: StoreConfig,
  storeSlug: string,
  now: Date = new Date(),
): ResolvedSlide[] {
  const authored = config?.heroSlides ?? [];
  const live = authored.filter((slide) => isLive(slide, now));

  // Three cases, and the last two are the ones that matter:
  //   * the merchant has live campaigns — show them;
  //   * the merchant has campaigns but all are scheduled away — fall back to
  //     the shop's permanent banner, because a home page that opens on a
  //     category rail looks broken rather than "between campaigns";
  //   * the merchant has never used the slideshow — that same banner, which is
  //     exactly what the shop showed before this module existed.
  const slides = live.length > 0 ? live : [legacySlide(config, storeConfig)];

  // The second button is a band like any other and is switched off the same
  // way. It only applies to the shop's permanent banner: on an authored slide,
  // a blank label is how a merchant says "one button here".
  const legacySecondary = showSection(config, 'heroSecondaryCta');

  return slides.map((slide) => {
    const authoredSlide = live.length > 0;
    return {
      ...slide,
      ctaHref: inStore(slide.ctaUrl, storeSlug, `/${storeSlug}/catalog`),
      secondaryCtaHref: inStore(slide.secondaryCtaUrl, storeSlug, `/${storeSlug}/locations`),
      showSecondary: authoredSlide
        ? Boolean(slide.secondaryCtaText.trim())
        : legacySecondary,
    };
  });
}
