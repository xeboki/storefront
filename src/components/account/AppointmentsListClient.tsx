'use client';

import { useState } from 'react';
import { Calendar, Clock, User, XCircle } from 'lucide-react';
import { clsx } from 'clsx';
import type { OrderingAppointment } from '@xeboki/sdk';

interface Props {
  initialAppointments: OrderingAppointment[];
  storeSlug: string;
}

const STATUS_FILTERS = [
  { key: undefined,     label: 'All' },
  { key: 'scheduled',   label: 'Upcoming' },
  { key: 'confirmed',   label: 'Confirmed' },
  // Shops that review their bookings leave them here. Without the filter a
  // customer could see the badge but had no way to list just the ones still
  // waiting on the shop.
  { key: 'pending',     label: 'Awaiting confirmation' },
  { key: 'completed',   label: 'Completed' },
  { key: 'cancelled',   label: 'Cancelled' },
];

function statusBadge(status: string): string {
  switch (status) {
    case 'confirmed':  return 'bg-emerald-50 text-emerald-700';
    case 'scheduled':  return 'bg-blue-50 text-blue-700';
    // A shop that reviews its bookings leaves them here until somebody
    // accepts. This was missing entirely, so a pending booking got the grey
    // "unknown status" badge and read as though something had gone wrong.
    case 'pending':    return 'bg-amber-50 text-amber-700';
    case 'completed':  return 'bg-slate-100 text-slate-600';
    case 'cancelled':  return 'bg-rose-50 text-rose-700';
    case 'no_show':    return 'bg-amber-50 text-amber-700';
    default:           return 'bg-slate-100 text-slate-600';
  }
}

function formatApptTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    + ' at '
    + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function AppointmentsListClient({ initialAppointments, storeSlug }: Props) {
  const [filter, setFilter] = useState<string | undefined>(undefined);
  const [appointments, setAppointments] = useState<OrderingAppointment[]>(initialAppointments);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const filtered = filter
    ? appointments.filter((a) => a.status === filter)
    : appointments;

  async function cancelAppointment(id: string) {
    if (!confirm('Cancel this appointment?')) return;
    setCancelling(id);

    const res = await fetch(`/api/appointments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeSlug, status: 'cancelled' }),
    });

    setCancelling(null);

    if (res.ok) {
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: 'cancelled' } : a)),
      );
    }
  }

  return (
    <div className="space-y-5">
      {/* Status filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.label}
            onClick={() => setFilter(f.key)}
            className={clsx(
              'flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium border transition-colors',
              filter === f.key || (!filter && !f.key)
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
        {filtered.length} appointment{filtered.length !== 1 ? 's' : ''}
      </p>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="py-16 flex flex-col items-center gap-3 text-slate-400">
          <Calendar size={40} className="opacity-30" />
          <p className="text-sm">No appointments found.</p>
          <a
            href={`/${storeSlug}/book`}
            className="text-sm text-primary hover:underline"
          >
            Book now
          </a>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 border border-slate-200 rounded-brand overflow-hidden">
          {filtered.map((appt) => {
            // A booking still awaiting the shop's acceptance is the *most*
            // cancellable thing on this list — nobody has committed to it yet.
            // Leaving `pending` out meant a customer of a shop that reviews
            // its bookings could not cancel their own request at all.
            const isCancellable =
              appt.status === 'scheduled' ||
              appt.status === 'confirmed' ||
              appt.status === 'pending';
            return (
              <li key={appt.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex-shrink-0 flex items-center justify-center">
                      <Calendar size={18} className="text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 text-sm">{appt.serviceName}</p>

                      <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                        <Clock size={12} />
                        <span>{formatApptTime(appt.startTime)}</span>
                      </div>

                      {appt.staffName && (
                        <div className="flex items-center gap-1 mt-0.5 text-xs text-slate-500">
                          <User size={12} />
                          <span>{appt.staffName}</span>
                        </div>
                      )}

                      <div className="mt-1.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge(appt.status)}`}>
                          {appt.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {isCancellable && (
                    <button
                      onClick={() => cancelAppointment(appt.id)}
                      disabled={cancelling === appt.id}
                      className="flex-shrink-0 flex items-center gap-1 text-xs text-slate-400 hover:text-rose-600 transition-colors disabled:opacity-50"
                    >
                      <XCircle size={14} />
                      Cancel
                    </button>
                  )}
                </div>

                {appt.notes && (
                  <p className="mt-2 text-xs text-slate-400 ml-13 pl-13">
                    Note: {appt.notes}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
