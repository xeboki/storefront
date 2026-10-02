'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Clock, Users } from 'lucide-react';
import { useMoney } from '@/lib/currency';
import type { OrderingClassSession } from '@xeboki/sdk';

/**
 * What is on, on the home page.
 *
 * The timetable band offered "A week at a time" and "A list" and drew
 * neither: it never read `variant` at all, so both choices rendered the same
 * heading and a link to the timetable page. Two names for one button.
 *
 * It shows the shop's real sessions and still sends a booking to
 * `/classes`, which holds the places-left state, the sign-in and the booking
 * call. A home page band is a shop window; putting a second booking form on
 * it would be two things to keep in step with one API.
 */

interface Props {
  storeSlug: string;
  /** The band's arrangement. `week` is the catalogue's fallback. */
  layout: 'week' | 'list';
  /** How many to show. A home page band is a taste, not the timetable. */
  limit?: number;
}

function startsAt(session: OrderingClassSession): number {
  return new Date(`${session.sessionDate}T${session.startTime}:00`).getTime();
}

function dayLabel(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  return d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
}

export function ClassTimetable({ storeSlug, layout, limit = 6 }: Props) {
  const money = useMoney();
  const [sessions, setSessions] = useState<OrderingClassSession[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/classes?storeSlug=${encodeURIComponent(storeSlug)}`);
        const json = await res.json();
        if (!cancelled && res.ok) setSessions(json.data ?? []);
      } catch {
        // A home page band is not the place to report a failed fetch: the
        // heading and the link above are still true and still work. The
        // timetable page says so properly.
      }
    })();
    return () => { cancelled = true; };
  }, [storeSlug]);

  // Nothing on, nothing loaded yet, or the fetch failed: the band keeps its
  // heading and its link, which is exactly what it drew before this existed.
  // A shop with no classes must not get a hole where a timetable would be.
  if (!sessions || sessions.length === 0) return null;

  const upcoming = [...sessions].sort((a, b) => startsAt(a) - startsAt(b));
  const href = `/${storeSlug}/classes`;

  if (layout === 'list') {
    return (
      <ul className="mt-8 divide-y divide-line border-y border-line text-start">
        {upcoming.slice(0, limit).map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-4 py-3">
            <div className="min-w-0">
              <p className="truncate font-medium text-fg">{s.serviceName}</p>
              <p className="mt-0.5 text-sm text-fg-muted">
                {dayLabel(s.sessionDate)} · {s.startTime}–{s.endTime}
              </p>
            </div>
            <div className="flex flex-none items-center gap-4">
              {s.price > 0 && <span className="font-semibold text-fg">{money(s.price)}</span>}
              <Link
                href={href}
                className="rounded-brand border border-primary px-4 py-1.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
              >
                {s.isBookable ? 'Book' : 'Full'}
              </Link>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  // A week at a time: one column per day that has something in it. Empty days
  // are left out rather than drawn blank — a shop that runs classes on three
  // days should not show four empty boxes to prove it.
  const days: { date: string; items: OrderingClassSession[] }[] = [];
  for (const session of upcoming) {
    const day = days.find((d) => d.date === session.sessionDate);
    if (day) day.items.push(session);
    else if (days.length < 7) days.push({ date: session.sessionDate, items: [session] });
  }

  return (
    <div className="mt-8 grid gap-4 text-start sm:grid-cols-2 lg:grid-cols-3">
      {days.map((day) => (
        <div key={day.date} className="rounded-brand border border-line bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-fg-subtle">
            {dayLabel(day.date)}
          </p>
          <ul className="mt-3 space-y-3">
            {day.items.map((s) => (
              <li key={s.id}>
                <Link href={href} className="group block">
                  <p className="truncate font-medium text-fg group-hover:text-primary">
                    {s.serviceName}
                  </p>
                  <p className="mt-0.5 flex items-center gap-3 text-sm text-fg-muted">
                    <span className="inline-flex items-center gap-1">
                      <Clock size={13} aria-hidden />
                      {s.startTime}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Users size={13} aria-hidden />
                      {s.isBookable ? `${s.placesLeft} left` : 'Full'}
                    </span>
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
