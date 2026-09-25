'use client';

/**
 * The store's currency, scoped to the request that is rendering.
 *
 * `formatCurrency` used to read `useStoreConfigStore.getState()`. That store is
 * created at module scope, so ON THE SERVER it is one object shared by the
 * whole process — and StoreProviders writes to it while rendering. Next renders
 * requests concurrently, so one shop's currency could be read by another shop's
 * render. It happened to look right in a single-tenant dev run, which is
 * exactly what makes it worth removing.
 *
 * React context is per-render, so it cannot leak between requests, and it is
 * available during SSR as well as in the browser.
 */
import { createContext, useContext, useMemo } from 'react';

const CurrencyContext = createContext<string>('USD');

export function CurrencyProvider({
  code,
  children,
}: {
  code: string | null | undefined;
  children: React.ReactNode;
}) {
  return (
    <CurrencyContext.Provider value={code || 'USD'}>
      {children}
    </CurrencyContext.Provider>
  );
}

/** The store's ISO currency code for this render. */
export function useCurrency(): string {
  return useContext(CurrencyContext);
}

/**
 * A money formatter bound to this store's currency.
 *
 *     const money = useMoney();
 *     money(12.5)   // "€12.50"
 */
export function useMoney(): (amount: number) => string {
  const code = useCurrency();
  return useMemo(() => {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 2,
    });
    return (amount: number) => formatter.format(amount);
  }, [code]);
}
