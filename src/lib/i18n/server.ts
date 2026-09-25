/**
 * Which language this request is being read in.
 *
 * The store layout called `resolveLocale(null)`, so every shopper got the
 * deployment default and there was no way to choose: the dictionaries and the
 * `t()` plumbing existed, but the shop was only ever multilingual in theory.
 *
 * Resolution mirrors the store picker: an explicit `?lang=`, then the header
 * the middleware saw on this same request, then the remembered cookie, then
 * the deployment default. The header step matters on the render right after a
 * switch — a cookie set on the RESPONSE is invisible to `cookies()` in the
 * render that set it.
 */
import { cookies, headers } from 'next/headers';
import { LOCALES, type Locale } from './dictionaries';
import { resolveLocale } from './index';
import { LOCALE_COOKIE } from './locale-cookie';

export { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE } from './locale-cookie';

function known(value: string | null | undefined): Locale | null {
  const pick = (value || '').slice(0, 2).toLowerCase();
  return (LOCALES as string[]).includes(pick) ? (pick as Locale) : null;
}

export function activeLocale(explicit?: string | null): Locale {
  const h = headers();
  return (
    known(explicit) ??
    known(h.get('x-xeboki-lang')) ??
    known(cookies().get(LOCALE_COOKIE)?.value) ??
    resolveLocale(null)
  );
}

/** Locales this deployment can actually render, for the switcher. */
export function availableLocales(): Locale[] {
  return LOCALES as Locale[];
}
