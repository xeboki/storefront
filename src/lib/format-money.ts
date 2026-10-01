/**
 * Money, formatted without a hook.
 *
 * `useMoney` reads the currency from React context, which means it is a
 * client hook and `currency.tsx` carries `'use client'`. A SERVER component
 * that imports it compiles cleanly — TypeScript cannot see the boundary —
 * and then throws `useMoney is not a function` at render. That is exactly
 * how the menu and service bands broke.
 *
 * So the bands that already KNOW the currency — every home-page band is
 * handed `storeConfig` — format with this instead. Same `Intl` call as
 * `useMoney`, so the two can never disagree about how a price reads.
 */
export function formatMoney(amount: number, currencyCode: string | null | undefined): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode || 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

/** A formatter bound to one store's currency, for a band that prints several. */
export function moneyFor(currencyCode: string | null | undefined) {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode || 'USD',
    minimumFractionDigits: 2,
  });
  return (amount: number) => formatter.format(amount);
}
