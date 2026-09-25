/**
 * The one location a shopper is shopping at.
 *
 * Before this there were two unrelated location concepts that never met: a
 * `?loc=` query param read only by the catalog page, and a branch resolved
 * again from scratch at checkout out of the city the shopper typed (falling
 * back to whichever pickup branch happened to be first). So a shopper could
 * browse Gulberg's shelves, fill a basket, and check out against Bahria
 * without ever being told. The product page, meanwhile, was scoped to no
 * location at all and showed the whole business's stock.
 *
 * Everything that asks "which store?" now asks here.
 */
import { cookies, headers } from 'next/headers';
import type { FulfillmentLocation, StorefrontConfig } from '@xeboki/sdk';
import { LOCATION_COOKIE } from './location-cookie';

export { LOCATION_COOKIE, LOCATION_COOKIE_MAX_AGE } from './location-cookie';

/** Branches a shopper can actually order from — one of delivery or pickup. */
export function onlineStores(config: StorefrontConfig | null): FulfillmentLocation[] {
  return (config?.fulfillmentLocations ?? []).filter(
    (l) => l.deliveryEnabled || l.pickupEnabled,
  );
}

/**
 * True when the merchant sells "pick a store, then browse it" rather than one
 * merged catalog. Only then does a chosen location scope what a shopper sees.
 */
export function isLocationFirst(config: StorefrontConfig | null): boolean {
  return (config?.catalogMode ?? 'unified') === 'location_first'
    && onlineStores(config).length > 0;
}

function byId(stores: FulfillmentLocation[], id: string | undefined | null) {
  return id ? stores.find((s) => s.locationId === id) ?? null : null;
}

/**
 * The store this request is shopping at: an explicit `?loc=` first, then the
 * `?loc=` the middleware saw on this same request, then the remembered cookie,
 * then the first branch.
 *
 * The header step matters on the render right after a switch: the middleware
 * sets the cookie on the RESPONSE, which `cookies()` cannot see yet, so
 * without it the first page after choosing a store still showed the old one.
 *
 * An id that is not one of this store's branches is ignored rather than
 * trusted — the value arrives from a URL and a cookie, and a stale or
 * hand-edited one would otherwise scope the catalog to a location the shopper
 * cannot buy from.
 */
export function activeLocation(
  config: StorefrontConfig | null,
  explicitId?: string | null,
): FulfillmentLocation | null {
  if (!isLocationFirst(config)) return null;
  const stores = onlineStores(config);
  return (
    byId(stores, explicitId) ??
    byId(stores, headers().get('x-xeboki-loc')) ??
    byId(stores, cookies().get(LOCATION_COOKIE)?.value) ??
    stores[0] ??
    null
  );
}

/** As above, for callers that only need the id to pass to the API. */
export function activeLocationId(
  config: StorefrontConfig | null,
  explicitId?: string | null,
): string | undefined {
  return activeLocation(config, explicitId)?.locationId;
}

/** A branch's display name, however sparsely the merchant filled it in. */
export function storeLabel(store: FulfillmentLocation | null): string {
  return store?.locationName || store?.city || 'Store';
}
