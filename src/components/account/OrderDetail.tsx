'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Package, RotateCw } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { trackPurchase } from '@/lib/analytics';
import { useStoreConfigStore } from '@/stores/storeConfigStore';
import type { OrderingOrder } from '@xeboki/sdk';

interface Props {
  order: OrderingOrder;
  storeSlug: string;
  isGuest?: boolean;
}

// Statuses after which we stop polling — the order won't change further.
const TERMINAL_STATUSES = new Set(['completed', 'cancelled', 'refunded']);

const STATUS_STEPS = [
  { key: 'pending',   label: 'Placed' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'preparing', label: 'Preparing' },
  { key: 'ready',     label: 'Ready' },
  { key: 'completed', label: 'Delivered' },
];

export function OrderDetail({ order: initialOrder, storeSlug, isGuest }: Props) {
  const [order, setOrder] = useState<OrderingOrder>(initialOrder);
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
      {/* Back link */}
      <Link
        href={isGuest ? `/${storeSlug}` : `/${storeSlug}/account`}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary transition-colors"
      >
        <ArrowLeft size={16} />
        {isGuest ? 'Back to store' : 'Back to account'}
      </Link>

      {/* Order header */}
      <div className="p-5 rounded-brand border border-slate-200 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-bold text-slate-900 text-lg">
              Order #{order.orderNumber ?? order.id.slice(-6).toUpperCase()}
            </h2>
            <p className="text-sm text-slate-400 mt-0.5">{formatDate(order.createdAt)}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${statusBadge(order.status)}`}>
              {STATUS_LABELS[order.status] ?? order.status}
            </span>
            {order.orderType && (
              <span className="text-xs text-slate-400 capitalize hidden sm:block">
                {order.orderType === 'pickup' ? 'Store Pickup' : order.orderType}
              </span>
            )}
          </div>
        </div>

        {/* Live refresh indicator */}
        {!isTerminal && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            Live tracking · Updated {formatTime(lastRefreshed)}
            <button
              onClick={fetchOrder}
              disabled={refreshing}
              className="ml-1 hover:text-primary disabled:opacity-40 transition-colors"
              aria-label="Refresh"
            >
              <RotateCw size={12} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        )}
      </div>

      {/* Progress tracker — hidden when cancelled */}
      {!isCancelled && (
        <div className="p-5 rounded-brand border border-slate-200">
          <h3 className="text-sm font-semibold text-slate-700 mb-5">Order Progress</h3>

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
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-slate-100 text-slate-400'
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
                          i < stepIndex ? 'bg-primary' : 'bg-slate-200'
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
                  className={`text-xs block text-center first:text-left ${
                    i === stepIndex
                      ? 'text-primary font-semibold'
                      : i < stepIndex
                      ? 'text-slate-500'
                      : 'text-slate-300'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            ))}
          </div>

          {/* ETA / status message */}
          <p className="text-xs text-slate-500 mt-3 text-center">
            {STATUS_MESSAGES[order.status] ?? ''}
          </p>
        </div>
      )}

      {/* Cancellation notice */}
      {isCancelled && (
        <div className="p-4 rounded-brand bg-rose-50 border border-rose-200 text-sm text-rose-700">
          This order has been cancelled.
        </div>
      )}

      {/* Delivery / notes info */}
      {(order.deliveryAddress || order.notes) && (
        <div className="p-5 rounded-brand border border-slate-200 space-y-3 text-sm">
          {order.deliveryAddress && (
            <div>
              <p className="font-semibold text-slate-700 mb-1">Delivery address</p>
              <p className="text-slate-500">{order.deliveryAddress}</p>
            </div>
          )}
          {order.notes && (
            <div>
              <p className="font-semibold text-slate-700 mb-1">Order notes</p>
              <p className="text-slate-500">{order.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Line items */}
      <div className="rounded-brand border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-700">
            Items ({order.items.reduce((n, i) => n + i.quantity, 0)})
          </h3>
        </div>
        <ul className="divide-y divide-slate-100">
          {order.items.map((item, idx) => (
            <li key={idx} className="flex items-center gap-4 p-4">
              <div className="w-12 h-12 rounded-lg bg-slate-100 flex-shrink-0 flex items-center justify-center text-slate-300">
                <Package size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900">{item.productName}</p>
                {item.variantLabel && (
                  <p className="text-xs text-slate-400">{item.variantLabel}</p>
                )}
                {item.modifierNames.length > 0 && (
                  <p className="text-xs text-slate-400">{item.modifierNames.join(', ')}</p>
                )}
                <p className="text-xs text-slate-400 mt-0.5">
                  {formatCurrency(item.unitPrice)} × {item.quantity}
                </p>
              </div>
              <p className="text-sm font-bold text-slate-900 whitespace-nowrap">
                {formatCurrency(item.totalPrice)}
              </p>
            </li>
          ))}
        </ul>

        {/* Totals */}
        <div className="px-5 py-4 border-t border-slate-200 space-y-2 text-sm bg-slate-50/60">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal</span>
            <span>{formatCurrency(order.subtotal)}</span>
          </div>
          {order.tax > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>Tax</span>
              <span>{formatCurrency(order.tax)}</span>
            </div>
          )}
          {order.discount > 0 && (
            <div className="flex justify-between text-emerald-700">
              <span>Discount</span>
              <span>−{formatCurrency(order.discount)}</span>
            </div>
          )}
          {order.shipping > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>Shipping</span>
              <span>{formatCurrency(order.shipping)}</span>
            </div>
          )}
          {order.loyaltyDiscount > 0 && (
            <div className="flex justify-between text-amber-600">
              <span>Loyalty points</span>
              <span>−{formatCurrency(order.loyaltyDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-slate-900 text-base pt-3 border-t border-slate-200">
            <span>Total</span>
            <span>{formatCurrency(order.total)}</span>
          </div>
          {order.paidTotal > 0 && order.paidTotal < order.total && (
            <div className="flex justify-between text-amber-700 text-xs">
              <span>Amount due</span>
              <span>{formatCurrency(order.total - order.paidTotal)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Guest CTA */}
      {isGuest && (
        <p className="text-sm text-center text-slate-500">
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

function statusBadge(status: string): string {
  switch (status) {
    case 'completed':  return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    case 'cancelled':  return 'bg-rose-50 text-rose-700 border border-rose-200';
    case 'pending':    return 'bg-amber-50 text-amber-700 border border-amber-200';
    case 'ready':      return 'bg-blue-50 text-blue-700 border border-blue-200';
    case 'preparing':  return 'bg-violet-50 text-violet-700 border border-violet-200';
    case 'confirmed':  return 'bg-sky-50 text-sky-700 border border-sky-200';
    default:           return 'bg-slate-100 text-slate-600 border border-slate-200';
  }
}

const STATUS_LABELS: Record<string, string> = {
  pending:    'Order Placed',
  confirmed:  'Confirmed',
  preparing:  'Being Prepared',
  ready:      'Ready for Pickup',
  completed:  'Delivered',
  cancelled:  'Cancelled',
  refunded:   'Refunded',
};

const STATUS_MESSAGES: Record<string, string> = {
  pending:    'Your order has been received and is awaiting confirmation.',
  confirmed:  'Your order has been confirmed and will be prepared shortly.',
  preparing:  'Your order is being prepared right now.',
  ready:      'Your order is ready! Please collect it or await delivery.',
  completed:  'Order complete. Enjoy!',
};
