'use client';

/**
 * Client i18n. The layout seeds the locale; components call useT() for strings.
 */
import { createContext, useContext } from 'react';
import { makeT } from './index';
import { DEFAULT_LOCALE, type Locale, type MessageKey } from './dictionaries';

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

export function useT(): (key: MessageKey, vars?: Record<string, string | number>) => string {
  return makeT(useContext(LocaleContext));
}
