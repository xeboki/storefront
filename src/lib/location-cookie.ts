/**
 * The chosen-store cookie's name and lifetime.
 *
 * Its own module because the middleware runs on the Edge and sets this cookie,
 * while `lib/location.ts` reads it through `next/headers` — which the Edge
 * runtime will not load. Both need the name; only one can import the other.
 */

/** Chosen store, as a location id. */
export const LOCATION_COOKIE = 'xeboki_loc';

/** A year: a shopper's local branch is not a per-session fact. */
export const LOCATION_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
