/**
 * The chosen-language cookie's name and lifetime.
 *
 * Its own module because the Edge middleware sets this cookie while the server
 * resolver reads it through `next/headers`, which the Edge runtime will not
 * load. Same split as location-cookie.ts.
 */
export const LOCALE_COOKIE = 'xeboki_lang';

/** A year: the language someone reads in is not a per-session fact. */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
