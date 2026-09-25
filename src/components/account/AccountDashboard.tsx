'use client';

import Link from 'next/link';
import { LogOut, Package, MapPin, User, Heart, Calendar, Edit } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useStoreConfigStore, APPOINTMENT_TYPES } from '@/stores/storeConfigStore';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { SessionPayload } from '@/lib/auth/session';
import type { OrderingOrder } from '@xeboki/sdk';

interface Props {
  session: SessionPayload;
  storeSlug: string;
  initialOrders: OrderingOrder[];
}

export function AccountDashboard({ session, storeSlug, initialOrders }: Props) {
  const logout = useAuthStore((s) => s.logout);
  const businessType = useStoreConfigStore((s) => s.businessType);
  const hasAppointments = APPOINTMENT_TYPES.has(businessType);

  return (
    <div className="space-y-8">
      {/* Profile card */}
      <div className="flex items-center justify-between p-5 rounded-brand border border-line bg-surface">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User size={20} className="text-primary" />
          </div>
          <div>
            <p className="font-semibold text-fg">{session.name}</p>
            <p className="text-sm text-fg-muted">{session.email}</p>
          </div>
        </div>
        <button
          onClick={() => logout(storeSlug)}
          className="flex items-center gap-1.5 text-sm text-fg-muted hover:text-rose-600 transition-colors"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href={`/${storeSlug}/account/orders`}
          className="flex items-center gap-3 p-4 rounded-brand border border-line hover:border-primary hover:bg-primary/5 transition-colors"
        >
          <Package size={20} className="text-primary" />
          <span className="font-medium text-fg">Orders</span>
        </Link>
        <Link
          href={`/${storeSlug}/account/addresses`}
          className="flex items-center gap-3 p-4 rounded-brand border border-line hover:border-primary hover:bg-primary/5 transition-colors"
        >
          <MapPin size={20} className="text-primary" />
          <span className="font-medium text-fg">Addresses</span>
        </Link>
        <Link
          href={`/${storeSlug}/account/wishlist`}
          className="flex items-center gap-3 p-4 rounded-brand border border-line hover:border-primary hover:bg-primary/5 transition-colors"
        >
          <Heart size={20} className="text-primary" />
          <span className="font-medium text-fg">Wishlist</span>
        </Link>
        {hasAppointments && (
          <Link
            href={`/${storeSlug}/account/appointments`}
            className="flex items-center gap-3 p-4 rounded-brand border border-line hover:border-primary hover:bg-primary/5 transition-colors"
          >
            <Calendar size={20} className="text-primary" />
            <span className="font-medium text-fg">Appointments</span>
          </Link>
        )}
        <Link
          href={`/${storeSlug}/account/profile`}
          className="flex items-center gap-3 p-4 rounded-brand border border-line hover:border-primary hover:bg-primary/5 transition-colors"
        >
          <Edit size={20} className="text-primary" />
          <span className="font-medium text-fg">Edit Profile</span>
        </Link>
      </div>

      {/* Recent orders */}
      <div>
        <h2 className="text-lg font-bold text-fg mb-4">Recent Orders</h2>
        {initialOrders.length === 0 ? (
          <p className="text-fg-subtle text-sm">No orders yet.</p>
        ) : (
          <ul className="divide-y divide-line border border-line rounded-brand overflow-hidden">
            {initialOrders.slice(0, 5).map((order) => (
              <li key={order.id}>
                <Link
                  href={`/${storeSlug}/orders/${order.id}`}
                  className="flex items-center justify-between p-4 hover:bg-surface-alt transition-colors"
                >
                  <div>
                    <p className="font-medium text-fg text-sm">
                      Order #{order.orderNumber ?? order.id.slice(-6).toUpperCase()}
                    </p>
                    <p className="text-xs text-fg-subtle mt-0.5">
                      {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-fg text-sm">
                      {formatCurrency(order.total)}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function statusColor(status: string): string {
  switch (status) {
    case 'completed': return 'bg-green-50 text-green-700';
    case 'cancelled': return 'bg-red-50 text-red-700';
    case 'pending': return 'bg-amber-50 text-amber-700';
    default: return 'bg-surface-alt text-fg-muted';
  }
}
