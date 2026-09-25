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

// ── URLs ────────────────────────────────────────────────────────────────────
//
// A branch needs a URL of its own, not a `?loc=<uuid>` query param: a query
// param cannot rank, cannot carry its own title, and cannot hold that branch's
// LocalBusiness data. Slugs come from the name a merchant already typed.

function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * `{slug: location}` for every branch a shopper can order from.
 *
 * Two branches can carry the same name — "Gulberg" twice in different cities is
 * ordinary — so a collision falls back to the city, then to a counter. Built
 * from the config's own order, so the same branch keeps the same URL as long as
 * the merchant does not reorder them.
 */
export function locationSlugs(
  config: StorefrontConfig | null,
): Map<string, FulfillmentLocation> {
  const out = new Map<string, FulfillmentLocation>();
  for (const store of onlineStores(config)) {
    const base = slugify(store.locationName || store.city || '') || 'store';
    let slug = base;
    if (out.has(slug)) {
      const withCity = slugify(`${store.locationName} ${store.city}`);
      slug = withCity && !out.has(withCity) ? withCity : slug;
    }
    let n = 2;
    while (out.has(slug)) slug = `${base}-${n++}`;
    out.set(slug, store);
  }
  return out;
}

/** This branch's slug, or null if it is not orderable online. */
export function slugFor(
  config: StorefrontConfig | null,
  locationId: string | null | undefined,
): string | null {
  if (!locationId) return null;
  for (const [slug, store] of locationSlugs(config)) {
    if (store.locationId === locationId) return slug;
  }
  return null;
}

/** The branch a `/l/{slug}` URL names. */
export function locationBySlug(
  config: StorefrontConfig | null,
  slug: string,
): FulfillmentLocation | null {
  return locationSlugs(config).get(slug) ?? null;
}

/**
 * Everywhere this branch delivers, in one list: the cities it serves plus its
 * own, deduped case-insensitively and in the merchant's own spelling.
 */
export function serviceArea(store: FulfillmentLocation): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const city of [store.city, ...store.servedCities]) {
    const key = city?.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(city.trim());
  }
  return out;
}
