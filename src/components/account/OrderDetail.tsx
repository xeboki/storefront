'use client';

import { useEffect, useRef, useState } from 'react';
import { ShareTheShop } from './ShareTheShop';
import Link from 'next/link';
import { ArrowLeft, Package, RotateCw } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useMoney } from '@/lib/currency';
import { ReturnRequest } from './ReturnRequest';
import { trackPurchase } from '@/lib/analytics';
import { useStoreConfigStore } from '@/stores/storeConfigStore';
import type { OrderingOrder } from '@xeboki/sdk';

interface Props {
  order: OrderingOrder;
  storeSlug: string;
  isGuest?: boolean;
  /**
   * The merchant's own words after an order is placed. Written on the Checkout
   * tab since it shipped and shown nowhere — a shop wanting to say "we'll text
   * you when it's ready" had no way to.
   */
  thankYouMessage?: string;
  /** The Checkout tab's switch, which read nothing until now. */
  showSocialShare?: boolean;
  shopName?: string;
}

// Statuses after which we stop polling — the order won't change further.
const TERMINAL_STATUSES = new Set(['completed', 'cancelled', 'refunded']);

/**
 * The steps a shopper watches their order move through.
 *
 * `preparing` was wrong — the server's status is `processing` — so the
 * tracker stopped dead at "Confirmed" and stayed there while the shop
 * picked, packed and shipped the order. The one bar a waiting shopper
 * actually looks at, stuck, for every order this shop has ever taken.
 */
const STATUS_STEPS = [
  { key: 'pending',    label: 'Placed' },
  { key: 'confirmed',  label: 'Confirmed' },
  { key: 'processing', label: 'Preparing' },
  { key: 'ready',      label: 'Ready' },
  { key: 'shipped',    label: 'On its way' },
  { key: 'completed',  label: 'Delivered' },
];

export function OrderDetail({
  order: initialOrder, storeSlug, isGuest, thankYouMessage,
  showSocialShare = false, shopName = '',
}: Props) {
  const money = useMoney();
  const [order, setOrder] = useState<OrderingOrder>(initialOrder);
  const shipments = order.shipments ?? [];
  // The API sends an OBJECT for a delivery order. Rendering it straight
  // threw "Objects are not valid as a React child" and 500'd the whole page
  // — for every delivery order ever placed, unseen because the shop it was
  // built against did collection only. Read in postal order, because a
  // dict's own order has put postcodes above street names.
  const addressLines = addressToLines(order.deliveryAddress);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isTerminal = TERMINAL_STATUSES.has(order.status);

  // ── Polling ──────────────────────────────────────────────────────────────────

  async function fetchOrder() {
    setRefreshing(true);
    try {
      const res = await fetch(
        `/api/orders/${order.id}?storeSlug=${encodeURIComponent(storeSlug)}`,
        { cache: 'no-store' },
      );
      if (res.ok) {
        const updated: OrderingOrder = await res.json();
        setOrder(updated);
        setLastRefreshed(new Date());
        // Stop polling once terminal
        if (TERMINAL_STATUSES.has(updated.status) && intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (isTerminal) return;
    // Poll every 30 s while order is active
    intervalRef.current = setInterval(fetchOrder, 30_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // GA4/Meta purchase — fired once per order id (deduped in trackPurchase),
  // so landing on or refreshing the confirmation page counts one conversion.
  useEffect(() => {
    trackPurchase(
      order.id,
      order.total,
      useStoreConfigStore.getState().currencyCode,
      order.items.map((i) => ({ id: i.productId, name: i.productName, price: i.unitPrice, quantity: i.quantity })),
      { shipping: order.shipping, tax: order.tax },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Derived ──────────────────────────────────────────────────────────────────

  const stepIndex = STATUS_STEPS.findIndex((s) => s.key === order.status);
  const isCancelled = order.status === 'cancelled';

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* The shop's own words, first: a thank-you that arrives below the
          fold is not a thank-you. */}
      {thankYouMessage && (
        <p className="rounded-brand border border-success-border bg-success-bg px-4 py-3 text-sm text-success-fg">
          {thankYouMessage}
        </p>
      )}

      {/* The shop, never the order — see ShareTheShop. */}
      {showSocialShare && (
        <ShareTheShop
          shopName={shopName}
          shopUrl={
            typeof window === 'undefined'
              ? ''
              : `${window.location.origin}/${storeSlug}`
          }
        />
      )}

      {/* Back link */}
      <Link
        href={isGuest ? `/${storeSlug}` : `/${storeSlug}/account`}
        className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-primary transition-colors"
      >
        <ArrowLeft size={16} />
        {isGuest ? 'Back to store' : 'Back to account'}
      </Link>

      {/* Order header */}
      <div className="p-5 rounded-brand border border-line space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-bold text-fg text-lg">
              Order #{order.orderNumber ?? order.id.slice(-6).toUpperCase()}
            </h2>
            <p className="text-sm text-fg-subtle mt-0.5">{formatDate(order.createdAt)}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${statusBadge(order.status)}`}>
              {STATUS_LABELS[order.status] ?? order.status}
            </span>
            {order.orderType && (
              <span className="text-xs text-fg-subtle capitalize hidden sm:block">
                {order.orderType === 'pickup' ? 'Store Pickup' : order.orderType}
              </span>
            )}
          </div>
        </div>

        {/* Live refresh indicator */}
        {!isTerminal && (
          <div className="flex items-center gap-2 text-xs text-fg-subtle">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
            </span>
            Live tracking · Updated {formatTime(lastRefreshed)}
            <button
              onClick={fetchOrder}
              disabled={refreshing}
              className="ms-1 hover:text-primary disabled:opacity-40 transition-colors"
              aria-label="Refresh"
            >
              <RotateCw size={12} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        )}
      </div>

      {/* Progress tracker — hidden when cancelled */}
      {!isCancelled && (
        <div className="p-5 rounded-brand border border-line">
          <h3 className="text-sm font-semibold text-fg mb-5">Order Progress</h3>

          {/* Step dots + connecting lines */}
          <div className="relative flex items-center">
            {STATUS_STEPS.map((step, i) => {
              const done = i <= stepIndex;
              const active = i === stepIndex;
              return (
                <div key={step.key} className="flex items-center flex-1 last:flex-none">
                  {/* Dot */}
                  <div className="relative flex-shrink-0">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                        done
                          ? 'bg-primary-solid text-primary-foreground'
                          : 'bg-surface-alt text-fg-subtle'
                      } ${active ? 'ring-4 ring-primary/20' : ''}`}
                    >
                      {done && i < stepIndex ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <span className="text-xs font-bold">{i + 1}</span>
                      )}
                    </div>
                  </div>

                  {/* Connector line */}
                  {i < STATUS_STEPS.length - 1 && (
                    <div className="flex-1 h-0.5 mx-2 transition-colors">
                      <div
                        className={`h-full transition-all duration-500 ${
                          i < stepIndex ? 'bg-primary-solid' : 'bg-surface-alt'
                        }`}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Step labels */}
          <div className="flex mt-2">
            {STATUS_STEPS.map((step, i) => (
              <div key={step.key} className="flex-1 last:flex-none">
                <span
                  className={`text-xs block text-center first:text-start ${
                    i === stepIndex
                      ? 'text-primary font-semibold'
                      : i < stepIndex
                      ? 'text-fg-muted'
                      : 'text-fg-subtle'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            ))}
          </div>

          {/* ETA / status message */}
          <p className="text-xs text-fg-muted mt-3 text-center">
            {STATUS_MESSAGES[order.status] ?? ''}
          </p>
        </div>
      )}

      {/* Where the parcel is.
          The one thing a shopper opens this page to find out, and until the
          shop could record a carrier and a number there was nothing to tell
          them. A parcel with no tracking page still says who is carrying it
          — "An Post have it" beats silence — but it shows no link, because a
          link that 404s reads as the shop having lost the order. */}
      {shipments.length > 0 && (
        <div className="p-4 rounded-brand border border-line bg-surface-alt/50 space-y-3">
          <h2 className="text-sm font-semibold">
            {shipments.length === 1 ? 'Your parcel' : 'Your parcels'}
          </h2>
          {shipments.map((parcel, i) => (
            <div key={parcel.tracking || i} className="text-sm space-y-1">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-medium">{parcel.carrier}</span>
                {parcel.service && (
                  <span className="text-xs text-fg-muted">{parcel.service}</span>
                )}
              </div>
              {parcel.tracking && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-fg-muted">
                    {parcel.tracking}
                  </span>
                  {parcel.trackingUrl && (
                    <a
                      href={parcel.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Track it &rarr;
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Cancellation notice */}
      {isCancelled && (
        <div className="p-4 rounded-brand bg-danger-bg border border-danger-border text-sm text-danger-fg">
          This order has been cancelled.
        </div>
      )}

      {/* Delivery / notes info */}
      {(order.deliveryAddress || order.notes) && (
        <div className="p-5 rounded-brand border border-line space-y-3 text-sm">
          {addressLines.length > 0 && (
            <div>
              <p className="font-semibold text-fg mb-1">Delivery address</p>
              {addressLines.map((line) => (
                <p key={line} className="text-fg-muted">{line}</p>
              ))}
            </div>
          )}
          {order.notes && (
            <div>
              <p className="font-semibold text-fg mb-1">Order notes</p>
              <p className="text-fg-muted">{order.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Line items */}
      <div className="rounded-brand border border-line overflow-hidden">
        <div className="px-5 py-3 bg-surface-alt border-b border-line">
          <h3 className="text-sm font-semibold text-fg">
            Items ({order.items.reduce((n, i) => n + i.quantity, 0)})
          </h3>
        </div>
        <ul className="divide-y divide-line">
          {order.items.map((item, idx) => (
            <li key={idx} className="flex items-center gap-4 p-4">
              <div className="w-12 h-12 rounded-lg bg-surface-alt flex-shrink-0 flex items-center justify-center text-fg-subtle">
                <Package size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-fg">{item.productName}</p>
                {item.variantLabel && (
                  <p className="text-xs text-fg-subtle">{item.variantLabel}</p>
                )}
                {item.modifierNames.length > 0 && (
                  <p className="text-xs text-fg-subtle">{item.modifierNames.join(', ')}</p>
                )}
                <p className="text-xs text-fg-subtle mt-0.5">
                  {money(item.unitPrice)} × {item.quantity}
                </p>
              </div>
              <p className="text-sm font-bold text-fg whitespace-nowrap">
                {money(item.totalPrice)}
              </p>
            </li>
          ))}
        </ul>

        {/* Totals */}
        <div className="px-5 py-4 border-t border-line space-y-2 text-sm bg-surface-alt/60">
          <div className="flex justify-between text-fg-muted">
            <span>Subtotal</span>
            <span>{money(order.subtotal)}</span>
          </div>
          {order.tax > 0 && (
            <div className="flex justify-between text-fg-muted">
              <span>Tax</span>
              <span>{money(order.tax)}</span>
            </div>
          )}
          {order.discount > 0 && (
            <div className="flex justify-between text-success-fg">
              <span>Discount</span>
              <span>−{money(order.discount)}</span>
            </div>
          )}
          {order.shipping > 0 && (
            <div className="flex justify-between text-fg-muted">
              <span>Shipping</span>
              <span>{money(order.shipping)}</span>
            </div>
          )}
          {order.loyaltyDiscount > 0 && (
            <div className="flex justify-between text-warning-fg">
              <span>Loyalty points</span>
              <span>−{money(order.loyaltyDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-fg text-base pt-3 border-t border-line">
            <span>Total</span>
            <span>{money(order.total)}</span>
          </div>
          {order.paidTotal > 0 && order.paidTotal < order.total && (
            <div className="flex justify-between text-warning-fg text-xs">
              <span>Amount due</span>
              <span>{money(order.total - order.paidTotal)}</span>
            </div>
          )}
        </div>
      </div>

      <ReturnRequest
        orderId={order.id}
        storeSlug={storeSlug}
        eligible={order.status === 'completed' || order.status === 'ready'}
      />

      {/* Guest CTA */}
      {isGuest && (
        <p className="text-sm text-center text-fg-muted">
          <Link
            href={`/${storeSlug}/register`}
            className="text-primary hover:underline font-medium"
          >
            Create an account
          </Link>{' '}
          to track all your orders in one place.
        </p>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

/**
 * An address as lines a postal service would read.
 *
 * Takes the object the API sends, or the single string an older shop stored.
 * Anything under a key nobody anticipated is still printed — a dropped
 * address line is an undelivered parcel.
 */
function addressToLines(address: unknown): string[] {
  if (!address) return [];
  if (typeof address === 'string') {
    return address.split('\n').map((l) => l.trim()).filter(Boolean);
  }
  if (typeof address !== 'object') return [];
  const fields = address as Record<string, unknown>;
  const order = ['name', 'company', 'line1', 'line_1', 'street', 'line2',
                 'line_2', 'city', 'town', 'state', 'county', 'postcode',
                 'postal_code', 'zip', 'country'];
  const seen = new Set<string>();
  const lines: string[] = [];
  const push = (value: unknown) => {
    const text = String(value ?? '').trim();
    if (text && !seen.has(text.toLowerCase())) {
      seen.add(text.toLowerCase());
      lines.push(text);
    }
  };
  order.forEach((key) => push(fields[key]));
  Object.entries(fields).forEach(([key, value]) => {
    if (key !== 'id' && key !== 'type' && typeof value !== 'object') push(value);
  });
  return lines;
}

function statusBadge(status: string): string {
  switch (status) {
    case 'completed':  return 'bg-success-bg text-success-fg border border-success-border';
    case 'cancelled':  return 'bg-danger-bg text-danger-fg border border-danger-border';
    case 'pending':    return 'bg-warning-bg text-warning-fg border border-warning-border';
    case 'ready':      return 'bg-info-bg text-info-fg border border-info-border';
    case 'processing': return 'bg-violet-50 text-violet-700 border border-violet-200';
    case 'shipped':    return 'bg-info-bg text-info-fg border border-info-border';
    case 'confirmed':  return 'bg-info-bg text-info-fg border border-info-border';
    default:           return 'bg-surface-alt text-fg-muted border border-line';
  }
}

const STATUS_LABELS: Record<string, string> = {
  pending:    'Order Placed',
  confirmed:  'Confirmed',
  processing: 'Being Prepared',
  ready:      'Ready for Pickup',
  shipped:    'On Its Way',
  completed:  'Delivered',
  cancelled:  'Cancelled',
  refunded:   'Refunded',
};

const STATUS_MESSAGES: Record<string, string> = {
  pending:    'Your order has been received and is awaiting confirmation.',
  confirmed:  'Your order has been confirmed and will be prepared shortly.',
  processing: 'Your order is being prepared right now.',
  ready:      'Your order is ready! Please collect it or await delivery.',
  shipped:    'Your order is on its way.',
  completed:  'Order complete. Enjoy!',
};
