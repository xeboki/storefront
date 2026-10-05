'use client';

import { createContext, useContext } from 'react';
import type { StorefrontConfig } from '@xeboki/sdk';

/**
 * The shop's own settings, where a client component can reach them.
 *
 * `StoreProviders` already took `storefrontConfig` and threw it away — the
 * prop was declared, passed from the layout and destructured out of
 * existence. So every client component that needed a shop setting either did
 * without or had it threaded down as a prop, and the catalogue's display
 * settings had no way to reach the card that draws a price.
 */
const StorefrontConfigContext = createContext<StorefrontConfig | null>(null);

export function StorefrontConfigProvider({
  config,
  children,
}: {
  config: StorefrontConfig | null;
  children: React.ReactNode;
}) {
  return (
    <StorefrontConfigContext.Provider value={config}>
      {children}
    </StorefrontConfigContext.Provider>
  );
}

export function useStorefrontConfig(): StorefrontConfig | null {
  return useContext(StorefrontConfigContext);
}

/**
 * What the catalogue shows about a product.
 *
 * The defaults are every shop that has never opened the Catalog tab, and
 * they are also what a component gets outside the provider — a storybook, a
 * test, a page that forgot to wrap. Prices shown is the safe side of that:
 * a shop accidentally hiding its prices sells nothing.
 */
export function useCatalogDisplay(): {
  showPrices: boolean;
  showStock: boolean;
} {
  const config = useStorefrontConfig();
  return {
    showPrices: config?.catalogShowPrices !== false,
    showStock: config?.catalogShowStock === true,
  };
}
