import type { StorefrontConfig } from '@xeboki/sdk';

/** The bands a merchant can switch off. */
export type SectionKey =
  | 'announcement'
  | 'trustBar'
  | 'categories'
  | 'featured'
  | 'collection'
  | 'editorial'
  /** The closing band above the footer. */
  | 'footerCta'
  /** Not a band: the hero's second button, switched the same way. */
  | 'heroSecondaryCta';

/**
 * Is this band shown?
 *
 * **An absent key means shown.** Every storefront configured before section
 * visibility existed has an empty map, and defaulting to hidden would have
 * emptied all of them on deploy. A merchant has to switch something off
 * deliberately; silence is not a decision.
 */
export function showSection(
  config: StorefrontConfig | null | undefined,
  key: SectionKey,
): boolean {
  return config?.sections?.[key] !== false;
}
