import type { StorefrontConfig } from '@xeboki/sdk';

/**
 * The words over each band of the home page.
 *
 * A merchant could already hide a band and choose which products it held, but
 * not say what it was called — so every Xeboki shop on the internet read
 * "Handpicked / Featured products / Chosen by the store this week", in English,
 * whatever it sold. That is the sort of thing that makes a storefront look like
 * a template rather than a shop.
 *
 * The defaults stay: a blank field means "the storefront's own wording", not an
 * empty heading. Absent and empty must both be safe, because every store
 * configured before this existed is in exactly that state.
 */
export interface SectionWords {
  eyebrow: string;
  title: string;
  lede: string;
  linkLabel: string;
}

/** What the band says when the merchant has said nothing. */
export type SectionDefaults = Partial<SectionWords>;

export function sectionWords(
  config: StorefrontConfig | null | undefined,
  key: string,
  defaults: SectionDefaults,
): SectionWords {
  const set = config?.sectionCopy?.[key];
  const pick = (chosen: string | undefined, fallback: string | undefined) => {
    const trimmed = (chosen ?? '').trim();
    return trimmed || fallback || '';
  };
  return {
    eyebrow:   pick(set?.eyebrow, defaults.eyebrow),
    title:     pick(set?.title, defaults.title),
    lede:      pick(set?.lede, defaults.lede),
    linkLabel: pick(set?.linkLabel, defaults.linkLabel),
  };
}
