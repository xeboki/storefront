/**
 * Shipping cost resolution.
 *
 * The checkout used to label a "Shipping & tax" line but never computed one, so
 * a shop that delivers could not charge for it. Rules come from the store's
 * StorefrontConfig when set, and fall back to deployment-level env defaults so
 * shipping works before a merchant configures it in Manager.
 *
 * Pickup / dine-in / takeaway are always free — only 'delivery' is charged.
 */
import type { StorefrontConfig } from '@xeboki/sdk';

export interface ShippingRules {
  flatRate: number;
  freeThreshold: number | null;
}

export function shippingRules(config: StorefrontConfig | null): ShippingRules {
  const envRate = Number(process.env.STOREFRONT_DEFAULT_SHIPPING_RATE ?? '');
  const envThreshold = Number(process.env.STOREFRONT_FREE_SHIPPING_THRESHOLD ?? '');

  const flatRate =
    config && config.shippingEnabled && config.shippingFlatRate > 0
      ? config.shippingFlatRate
      : Number.isFinite(envRate) && envRate > 0
        ? envRate
        : 0;

  const freeThreshold =
    config && config.freeShippingThreshold != null
      ? config.freeShippingThreshold
      : Number.isFinite(envThreshold) && envThreshold > 0
        ? envThreshold
        : null;

  return { flatRate, freeThreshold };
}

/**
 * Shipping charged for a given delivery type and merchandise subtotal
 * (subtotal already net of any discount). Rounded to 2dp.
 */
export function computeShipping(
  deliveryType: 'pickup' | 'delivery' | 'dineIn',
  subtotal: number,
  config: StorefrontConfig | null,
): number {
  if (deliveryType !== 'delivery') return 0;
  const { flatRate, freeThreshold } = shippingRules(config);
  if (flatRate <= 0) return 0;
  if (freeThreshold != null && subtotal >= freeThreshold) return 0;
  return Math.round(flatRate * 100) / 100;
}
