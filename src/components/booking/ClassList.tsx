'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { clsx } from 'clsx';
import { Users, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { formatCurrency } from '@/lib/utils';
import type { OrderingClassSession } from '@xeboki/sdk';

interface Props {
  storeSlug: string;
}

function formatWhen(session: OrderingClassSession): string {
  const day = new Date(`${session.sessionDate}T${session.startTime}:00`);
  const date = day.toLocaleDateString([], {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  return `${date} · ${session.startTime}–${session.endTime}`;
}

/**
 * Group classes a customer can book a place in.
 *
 * Places left are shown rather than hidden, and a full class stays on the list
 * marked sold out: a customer who cannot see the class they attend every week
 * assumes the site is broken, not that it is busy.
 */
export function ClassList({ storeSlug }: Props) {
  const router = useRouter();
  const customer = useAuthStore((s) => s.customer);

  const [classes, setClasses] = useState<OrderingClassSession[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [booking, setBooking] = useState<string | null>(null);
  const [booked, setBooked] = useState<Set<string>>(new Set());
  const [error, setError] = useState<{ id: string; message: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/classes?storeSlug=${encodeURIComponent(storeSlug)}`);
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(json.error ?? 'Failed to load classes');
        setClasses(json.data ?? []);
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Failed to load classes');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storeSlug]);

  async function handleBook(session: OrderingClassSession) {
    if (!customer) {
      router.push(`/${storeSlug}/login?next=/${storeSlug}/classes`);
      return;
    }

    setBooking(session.id);
    setError(null);
    try {
      const res = await fetch(`/api/classes/${encodeURIComponent(session.id)}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeSlug }),
      });
      const json = await res.json();

      if (!res.ok) {
        // The place went while they were deciding, or they are already in.
        // Both are ordinary answers; the list is refreshed so the count they
        // are looking at is the true one.
        setError({ id: session.id, message: json.error ?? 'Could not book that class' });
        if (res.status === 409) {
          const refresh = await fetch(
            `/api/classes?storeSlug=${encodeURIComponent(storeSlug)}`,
          );
          if (refresh.ok) setClasses((await refresh.json()).data ?? []);
        }
        return;
      }

      setBooked((prev) => new Set(prev).add(session.id));
      setClasses((prev) =>
        (prev ?? []).map((c) =>
          c.id === session.id
            ? { ...c, placesLeft: json.placesLeft, isBookable: json.placesLeft > 0 }
            : c,
        ),
      );
    } catch {
      setError({ id: session.id, message: 'Could not book that class' });
    } finally {
      setBooking(null);
    }
  }

  if (loadError) {
    return (
      <div className="flex items-center gap-2 text-sm text-red-600">
        <AlertCircle className="h-4 w-4" />
        {loadError}
      </div>
    );
  }

  if (classes === null) {
    return <p className="text-sm text-slate-500">Loading classes…</p>;
  }

  if (classes.length === 0) {
    return <p className="text-sm text-slate-500">No classes are scheduled right now.</p>;
  }

  return (
    <ul className="space-y-3">
      {classes.map((session) => {
        const isBooked = booked.has(session.id);
        const soldOut = session.placesLeft <= 0;
        const busy = booking === session.id;

        return (
          <li
            key={session.id}
            className={clsx(
              'rounded-brand border p-4 bg-surface',
              soldOut && !isBooked ? 'border-slate-200 opacity-70' : 'border-slate-200',
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-semibold text-slate-900 truncate">
                  {session.serviceName}
                </p>
                <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  {formatWhen(session)}
                  {session.staffName ? ` · ${session.staffName}` : ''}
                </p>
                <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-1">
                  <Users className="h-3.5 w-3.5 shrink-0" />
                  {soldOut
                    ? 'Fully booked'
                    : `${session.placesLeft} of ${session.capacity} places left`}
                </p>
              </div>

              <div className="text-right shrink-0">
                {session.price > 0 && (
                  <p className="font-semibold text-slate-900 mb-2">
                    {formatCurrency(session.price)}
                  </p>
                )}

                {isBooked ? (
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    Booked
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleBook(session)}
                    disabled={soldOut || busy}
                    className={clsx(
                      'rounded-brand px-4 py-2 text-sm font-medium transition',
                      soldOut || busy
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-brand text-white hover:opacity-90',
                    )}
                  >
                    {busy ? 'Booking…' : soldOut ? 'Full' : 'Book'}
                  </button>
                )}
              </div>
            </div>

            {error !== null && error.id === session.id && (
              <p className="mt-3 flex items-center gap-1.5 text-sm text-red-600">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error.message}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
