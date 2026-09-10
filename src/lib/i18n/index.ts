/**
 * Locale resolution + translation, usable from server and client.
 * Resolution order: explicit override → store's configured language →
 * NEXT_PUBLIC_DEFAULT_LOCALE → 'en'. Unknown keys/locales fall back to English.
 */
import { MESSAGES, DEFAULT_LOCALE, LOCALES, type Locale, type MessageKey } from './dictionaries';

export function resolveLocale(candidate?: string | null): Locale {
  const envDefault = (process.env.NEXT_PUBLIC_DEFAULT_LOCALE as Locale) || DEFAULT_LOCALE;
  const pick = (candidate || '').slice(0, 2).toLowerCase();
  if (pick && (LOCALES as string[]).includes(pick)) return pick as Locale;
  if ((LOCALES as string[]).includes(envDefault)) return envDefault;
  return DEFAULT_LOCALE;
}

export function translate(
  locale: Locale,
  key: MessageKey,
  vars?: Record<string, string | number>,
): string {
  const table = MESSAGES[locale] ?? MESSAGES[DEFAULT_LOCALE];
  let str: string = (table as Record<string, string>)[key] ?? MESSAGES[DEFAULT_LOCALE][key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) str = str.replace(`{${k}}`, String(v));
  return str;
}

export function makeT(locale: Locale) {
  return (key: MessageKey, vars?: Record<string, string | number>) => translate(locale, key, vars);
}

export type { Locale, MessageKey };
