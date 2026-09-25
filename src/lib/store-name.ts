import type { StoreConfig } from '@xeboki/sdk';

/**
 * The shop's name, as a customer should see it.
 *
 * `businessName` is whatever was typed at signup and is frequently a legal or
 * simply mistyped form — sub 34's reads "game ebnch" while its `displayName`
 * reads "Game Bench". Every customer-facing surface resolves display first:
 * the header, page titles, the hero, the footer, structured data and order
 * emails were all showing the raw signup value.
 *
 * One helper rather than `displayName || businessName` at forty call sites,
 * so the rule cannot be half-applied.
 */
export function storeName(config: Pick<StoreConfig, 'businessName' | 'displayName'>): string {
  return (config.displayName || '').trim() || config.businessName;
}
