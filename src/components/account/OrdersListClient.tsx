'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Package } from 'lucide-react';
import { clsx } from 'clsx';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { OrderingOrder } from '@xeboki/sdk';

interface Props {
  initialOrders: OrderingOrder[];
  total: number;
  storeSlug: string;
  initialStatus?: string;
}

const STATUS_FILTERS = [
  { key: undefined,     label: 'All' },
  { key: 'pending',     label: 'Pending' },
  { key: 'confirmed',   label: 'Confirmed' },
  { key: 'preparing',   label: 'Preparing' },
  { key: 'ready',       label: 'Ready' },
  { key: 'completed',   label: 'Completed' },
  { key: 'cancelled',   label: 'Cancelled' },
];

export function OrdersListClient({ initialOrders, total, storeSlug, initialStatus }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [orders] = useState<OrderingOrder[]>(initialOrders);

  function setStatus(status: string | undefined) {
    startTransition(() => {
      const params = status ? `?status=${status}` : '';
      router.push(`/${storeSlug}/account/orders${params}`);
    });
  }

  return (
    <div className="space-y-5">
      {/* Status filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.label}
            onClick={() => setStatus(f.key)}
            disabled={isPending}
            className={clsx(
              'flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium border transition-colors',
              initialStatus === f.key || (!initialStatus && !f.key)
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-surface text-slate-600 border-slate-200 hover:border-primary hover:text-primary',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Count */}
      <p className="text-sm text-slate-400">
        {total} order{total !== 1 ? 's' : ''}
        {initialStatus ? ` · ${initialStatus}` : ''}
      </p>

      {/* Order list */}
      {orders.length === 0 ? (
        <div className="py-16 flex flex-col items-center gap-3 text-slate-400">
          <Package size={40} className="opacity-30" />
          <p className="text-sm">No orders found.</p>
          <Link
            href={`/${storeSlug}/catalog`}
            className="text-sm text-primary hover:underline"
          >
            Start shopping
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 border border-slate-200 rounded-brand overflow-hidden">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/${storeSlug}/orders/${order.id}`}
                className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors gap-4"
              >
                {/* Left: order info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex-shrink-0 flex items-center justify-center text-slate-400">
                    <Package size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 text-sm">
                      #{order.orderNumber ?? order.id.slice(-6).toUpperCase()}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {formatDate(order.createdAt)}
                      {order.orderType && (
                        <span className="ml-2 capitalize">{order.orderType}</span>
                      )}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                {/* Right: total + status */}
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-slate-900 text-sm">
                    {formatCurrency(order.total)}
                  </p>
                  <span className={`text-xs mt-1 inline-block px-2 py-0.5 rounded-full font-medium ${statusBadge(order.status)}`}>
                    {STATUS_LABEL[order.status] ?? order.status}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function statusBadge(status: string): string {
  switch (status) {
    case 'completed':  return 'bg-emerald-50 text-emerald-700';
    case 'cancelled':  return 'bg-rose-50 text-rose-700';
    case 'pending':    return 'bg-amber-50 text-amber-700';
    case 'ready':      return 'bg-blue-50 text-blue-700';
    case 'preparing':  return 'bg-violet-50 text-violet-700';
    default:           return 'bg-slate-100 text-slate-600';
  }
}

const STATUS_LABEL: Record<string, string> = {
  pending:   'Pending',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready:     'Ready',
  completed: 'Completed',
  cancelled: 'Cancelled',
  refunded:  'Refunded',
};
