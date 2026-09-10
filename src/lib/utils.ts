import { useStoreConfigStore } from '@/stores/storeConfigStore';

/**
 * Formats money in the store's own currency. Every call site used to default to
 * USD, so a EUR (or any non-USD) shop showed "$" on every price — product cards,
 * cart, checkout, orders. When no currency is passed we read the one the store
 * was configured with (seeded into the client store by StoreProviders); pass an
 * explicit code to override.
 */
export function formatCurrency(amount: number, currency?: string): string {
  const code = currency ?? useStoreConfigStore.getState().currencyCode ?? 'USD';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: code,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
