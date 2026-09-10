'use client';

/**
 * Client-side conversion tracking — GA4 (gtag) and Meta Pixel (fbq).
 *
 * The storefront had zero analytics, so paid acquisition couldn't be measured.
 * Every function here is a safe no-op when the tag isn't present (no id set, or
 * blocked), so it never throws. Events follow GA4's recommended e-commerce
 * schema so they light up in reports without extra mapping.
 */

type Params = Record<string, unknown>;

/* eslint-disable @typescript-eslint/no-explicit-any */
function gtag(...args: any[]): void {
  const w = window as any;
  if (typeof w.gtag === 'function') w.gtag(...args);
}
function fbq(...args: any[]): void {
  const w = window as any;
  if (typeof w.fbq === 'function') w.fbq(...args);
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export interface TrackItem {
  id: string;
  name: string;
  price: number;
  quantity?: number;
  category?: string | null;
}

function ga4Items(items: TrackItem[]) {
  return items.map((i) => ({
    item_id: i.id,
    item_name: i.name,
    price: i.price,
    quantity: i.quantity ?? 1,
    ...(i.category ? { item_category: i.category } : {}),
  }));
}

export function trackViewItem(item: TrackItem, currency: string): void {
  if (typeof window === 'undefined') return;
  gtag('event', 'view_item', { currency, value: item.price, items: ga4Items([item]) });
  fbq('track', 'ViewContent', { content_ids: [item.id], content_name: item.name, value: item.price, currency });
}

export function trackAddToCart(item: TrackItem, currency: string): void {
  if (typeof window === 'undefined') return;
  const value = item.price * (item.quantity ?? 1);
  gtag('event', 'add_to_cart', { currency, value, items: ga4Items([item]) });
  fbq('track', 'AddToCart', { content_ids: [item.id], content_name: item.name, value, currency });
}

export function trackBeginCheckout(items: TrackItem[], value: number, currency: string): void {
  if (typeof window === 'undefined') return;
  gtag('event', 'begin_checkout', { currency, value, items: ga4Items(items) });
  fbq('track', 'InitiateCheckout', {
    content_ids: items.map((i) => i.id),
    num_items: items.reduce((n, i) => n + (i.quantity ?? 1), 0),
    value,
    currency,
  });
}

/**
 * Purchase — deduped per order id via sessionStorage so a refresh of the order
 * page doesn't double-count the conversion.
 */
export function trackPurchase(
  orderId: string,
  value: number,
  currency: string,
  items: TrackItem[],
  extra?: Params,
): void {
  if (typeof window === 'undefined') return;
  const key = `xbk-purchase-tracked:${orderId}`;
  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
  } catch {
    /* private mode — fall through and track once per load */
  }
  gtag('event', 'purchase', {
    transaction_id: orderId,
    currency,
    value,
    items: ga4Items(items),
    ...(extra ?? {}),
  });
  fbq('track', 'Purchase', { content_ids: items.map((i) => i.id), value, currency });
}


/** Fires an experiment exposure (GA4 + Meta) for A/B analysis. */
export function trackExperiment(experimentId: string, variantId: string): void {
  if (typeof window === 'undefined') return;
  gtag('event', 'experiment_impression', { experiment_id: experimentId, variant_id: variantId });
  fbq('trackCustom', 'Experiment', { experiment: experimentId, variant: variantId });
}
