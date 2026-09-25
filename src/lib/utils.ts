/**
 * Formats money in a currency the caller names.
 *
 * `currency` is REQUIRED. It used to fall back to
 * `useStoreConfigStore.getState()`, and that store is created at module scope —
 * so on the server it is one object shared by the whole process, written to
 * during render. Next serves requests concurrently, so one shop's currency
 * could be read by another shop's render. Making the argument required is what
 * stops a call site quietly reaching for a global again.
 *
 * Inside a client component use `useMoney()` from lib/currency, which reads the
 * per-render context. A server component passes `storeConfig.currencyCode`.
 */
export function formatCurrency(amount: number, currency: string): string {
  const code = currency || 'USD';
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
