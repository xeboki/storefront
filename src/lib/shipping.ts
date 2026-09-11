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
import type { StorefrontConfig, FulfillmentLocation } from '@xeboki/sdk';

export interface ShippingRules {
  flatRate: number;
  freeThreshold: number | null;
}

const _norm = (s: string) => s.trim().toLowerCase();

/**
 * The branch that delivers to `city` (city/location-based model), or null when
 * no branch serves it. A branch serves a city if it is in the branch's
 * `servedCities` list or is the branch's own city. Cheapest serving branch wins.
 */
export function resolveDeliveryLocation(
  city: string | null | undefined,
  config: StorefrontConfig | null,
): FulfillmentLocation | null {
  if (!config || !city) return null;
  const c = _norm(city);
  if (!c) return null;
  const serving = config.fulfillmentLocations.filter(
    (l) =>
      l.deliveryEnabled &&
      (l.servedCities.some((sc) => _norm(sc) === c) || _norm(l.city) === c),
  );
  if (serving.length === 0) return null;
  return serving.reduce((a, b) => (b.deliveryFee < a.deliveryFee ? b : a));
}

/** Branches offering click & collect, for the pickup-location picker. */
export function pickupLocations(config: StorefrontConfig | null): FulfillmentLocation[] {
  return config?.fulfillmentLocations.filter((l) => l.pickupEnabled) ?? [];
}

/**
 * Delivery charge for `city` under the location model: the serving branch's fee
 * (free at/above its threshold), else the store-level default fee (free at/above
 * the store threshold), else the deployment env fallback.
 */
export function computeShippingForCity(
  deliveryType: 'pickup' | 'delivery' | 'dineIn',
  subtotal: number,
  city: string | null | undefined,
  config: StorefrontConfig | null,
): number {
  if (deliveryType !== 'delivery') return 0;
  const branch = resolveDeliveryLocation(city, config);
  if (branch) {
    if (branch.freeShippingThreshold != null && subtotal >= branch.freeShippingThreshold) {
      return 0;
    }
    return Math.round(branch.deliveryFee * 100) / 100;
  }
  const def = config?.defaultDeliveryFee ?? 0;
  if (def > 0) {
    const t = config?.freeShippingThreshold ?? null;
    if (t != null && subtotal >= t) return 0;
    return Math.round(def * 100) / 100;
  }
  return computeShipping('delivery', subtotal, config); // env fallback
}

/**
 * Applicable tax % for an order the given branch fulfills (else store default).
 * Display-only: the charged total's tax is computed by the POS from the
 * business's own tax config server-side, so this surfaces the local rate to the
 * buyer without double-charging.
 */
export function taxRateFor(
  branch: FulfillmentLocation | null,
  config: StorefrontConfig | null,
): number {
  if (branch && branch.taxRate > 0) return branch.taxRate;
  return config?.defaultTaxRate ?? 0;
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
