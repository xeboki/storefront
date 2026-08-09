'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { clsx } from 'clsx';
import { ChevronLeft, ChevronRight, Calendar, Clock, User, CheckCircle } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { formatCurrency } from '@/lib/utils';
import type { OrderingProduct, OrderingStaff } from '@xeboki/sdk';

// ── Time slot helpers ──────────────────────────────────────────────────────────
//
// There was a `generateSlots()` here that invented the shop's diary in the
// browser: 09:00 to 17:00 every half hour, **every day of the week**, ignoring
// the working days, blocked dates, opening hours, staff rota, the length of the
// service and every booking already made. A shop closed on Sundays was shown
// offering Sunday mornings, and two customers could be handed the same slot.
//
// Availability now comes from `/api/availability`, which asks the shop.

/** One bookable start, as the availability endpoint reports it. */
interface Slot {
  start_time: string;   // "HH:mm", shop-local
  end_time: string;
  available: boolean;
  reason: string | null;
}

interface DayAvailability {
  date: string;         // "yyyy-MM-dd"
  is_open: boolean;
  slots: Slot[];
  available_count: number;
}

function formatSlot(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

// ── Types ──────────────────────────────────────────────────────────────────────

type Step = 'service' | 'staff' | 'datetime' | 'confirm' | 'done';

interface Props {
  storeSlug: string;
  services: OrderingProduct[];
  staff: OrderingStaff[];
}

// ── Component ──────────────────────────────────────────────────────────────────

export function BookingWidget({ storeSlug, services, staff }: Props) {
  const router = useRouter();
  const customer = useAuthStore((s) => s.customer);

  const [step, setStep] = useState<Step>('service');
  const [selectedService, setSelectedService] = useState<OrderingProduct | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<OrderingStaff | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  // Calendar state
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [viewStart, setViewStart] = useState(today);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Week days (7 days from viewStart)
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(viewStart, i));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookedAppt, setBookedAppt] = useState<{ id: string } | null>(null);

  // ── Real availability ────────────────────────────────────────────────────
  //
  // Fetched for the whole visible week rather than per day: the strip shows
  // which days are worth tapping, and a request per tap makes the shop look
  // slow and empty until each one lands.
  const [days, setDays] = useState<DayAvailability[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedService) return;

    let cancelled = false;
    setLoadingSlots(true);
    setSlotsError(null);

    const url =
      `/api/availability?storeSlug=${encodeURIComponent(storeSlug)}` +
      `&serviceId=${encodeURIComponent(selectedService.id)}` +
      `&startDate=${isoDate(viewStart)}&days=7` +
      (selectedStaff ? `&staffId=${encodeURIComponent(selectedStaff.id)}` : '');

    fetch(url)
      .then(async (res) => {
        if (!res.ok) throw new Error('unavailable');
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setDays(data.days ?? []);
      })
      .catch(() => {
        if (cancelled) return;
        // Never fall back to a generated grid. Showing made-up times is the
        // failure this replaced, and an honest error is better than a booking
        // the shop cannot honour.
        setDays([]);
        setSlotsError('We could not load available times. Please try again.');
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false);
      });

    return () => { cancelled = true; };
  }, [storeSlug, selectedService, selectedStaff, viewStart]);

  const dayFor = (d: Date): DayAvailability | undefined =>
    days.find((x) => x.date === isoDate(d));

  const selectedDay = selectedDate ? dayFor(selectedDate) : undefined;
  const slots = selectedDay?.slots ?? [];

  // Reset slot when date changes
  useEffect(() => { setSelectedSlot(null); }, [selectedDate]);

  // ── Booking submission ────────────────────────────────────────────────────────

  async function handleBook() {
    if (!selectedService || !selectedSlot) return;
    if (!customer) {
      router.push(`/${storeSlug}/login?next=/${storeSlug}/book`);
      return;
    }

    setLoading(true);
    setError(null);

    const res = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storeSlug,
        serviceId: selectedService.id,
        staffId: selectedStaff?.id,
        startTime: selectedSlot,
        notes: notes || undefined,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const { error: msg } = await res.json().catch(() => ({ error: 'Failed to book' }));
      setError(msg ?? 'Failed to book appointment');
      return;
    }

    const appt = await res.json();
    setBookedAppt(appt);
    setStep('done');
  }

  // ── Step: service ─────────────────────────────────────────────────────────────

  if (step === 'service') {
    return (
      <div className="space-y-4">
        <h2 className="font-bold text-slate-900 text-lg">Choose a Service</h2>
        {services.length === 0 ? (
          <p className="text-slate-400 text-sm">No services available.</p>
        ) : (
          <ul className="space-y-2">
            {services.map((svc) => (
              <li key={svc.id}>
                <button
                  onClick={() => { setSelectedService(svc); setStep('staff'); }}
                  className="w-full flex items-center justify-between p-4 rounded-brand border border-slate-200 hover:border-primary hover:bg-primary/5 transition-colors text-left"
                >
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{svc.name}</p>
                    {svc.description && (
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{svc.description}</p>
                    )}
                  </div>
                  <span className="font-bold text-primary ml-4 whitespace-nowrap">
                    {formatCurrency(svc.price)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  // ── Step: staff ───────────────────────────────────────────────────────────────

  if (step === 'staff') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <button onClick={() => setStep('service')} className="text-slate-400 hover:text-primary transition-colors">
            <ChevronLeft size={20} />
          </button>
          <h2 className="font-bold text-slate-900 text-lg">Choose Staff</h2>
        </div>
        <p className="text-sm text-slate-500">
          Service: <span className="font-medium text-slate-700">{selectedService?.name}</span>
        </p>

        <button
          onClick={() => { setSelectedStaff(null); setStep('datetime'); }}
          className="w-full flex items-center gap-3 p-4 rounded-brand border border-slate-200 hover:border-primary hover:bg-primary/5 transition-colors text-left"
        >
          <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
            <User size={18} className="text-slate-400" />
          </div>
          <div>
            <p className="font-semibold text-slate-900 text-sm">Any available staff</p>
            <p className="text-xs text-slate-400">We&apos;ll assign the next available person</p>
          </div>
        </button>

        {staff.map((s) => (
          <button
            key={s.id}
            onClick={() => { setSelectedStaff(s); setStep('datetime'); }}
            className="w-full flex items-center gap-3 p-4 rounded-brand border border-slate-200 hover:border-primary hover:bg-primary/5 transition-colors text-left"
          >
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary font-bold text-sm">
              {s.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-sm">{s.name}</p>
              {s.role && <p className="text-xs text-slate-400">{s.role}</p>}
            </div>
          </button>
        ))}
      </div>
    );
  }

  // ── Step: datetime ────────────────────────────────────────────────────────────

  if (step === 'datetime') {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <button onClick={() => setStep('staff')} className="text-slate-400 hover:text-primary transition-colors">
            <ChevronLeft size={20} />
          </button>
          <h2 className="font-bold text-slate-900 text-lg">Pick a Date & Time</h2>
        </div>

        {/* Week navigator */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <button
              onClick={() => setViewStart(addDays(viewStart, -7))}
              disabled={viewStart <= today}
              className="p-1 hover:text-primary disabled:opacity-30 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="font-medium text-slate-600">
              {viewStart.toLocaleDateString([], { month: 'long', year: 'numeric' })}
            </span>
            <button
              onClick={() => setViewStart(addDays(viewStart, 7))}
              className="p-1 hover:text-primary transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((day) => {
              const isPast = day < today;
              const info = dayFor(day);
              // A day with nothing free is not worth tapping. Disabled only
              // once the answer has arrived — greying the strip while it loads
              // makes every shop look shut for a moment.
              const isUnavailable =
                info !== undefined && info.available_count === 0;
              const isSelected = selectedDate && isoDate(day) === isoDate(selectedDate);
              return (
                <button
                  key={isoDate(day)}
                  disabled={isPast || isUnavailable}
                  title={
                    info && !info.is_open
                      ? 'Closed'
                      : isUnavailable
                      ? 'Fully booked'
                      : undefined
                  }
                  onClick={() => setSelectedDate(day)}
                  className={clsx(
                    'flex flex-col items-center py-2 rounded-brand text-xs font-medium transition-colors',
                    isSelected
                      ? 'bg-primary text-primary-foreground'
                      : isPast || isUnavailable
                      ? 'text-slate-300 cursor-not-allowed'
                      : 'text-slate-700 hover:bg-primary/10 hover:text-primary border border-slate-200',
                  )}
                >
                  <span className="uppercase">{day.toLocaleDateString([], { weekday: 'short' })}</span>
                  <span className="font-bold text-base mt-0.5">{day.getDate()}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Time slots */}
        {selectedDate && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
              <Clock size={14} />
              Available times
            </p>

            {loadingSlots ? (
              <p className="text-sm text-slate-400 py-4">Checking availability…</p>
            ) : slotsError ? (
              <p className="text-sm text-red-600 py-4">{slotsError}</p>
            ) : selectedDay && !selectedDay.is_open ? (
              // Said outright. A closed shop and a fully booked one look
              // identical from an empty grid, and a customer reads them very
              // differently — one means "come another day", the other means
              // "try another time".
              <p className="text-sm text-slate-500 py-4">
                We&apos;re closed on this day. Please choose another date.
              </p>
            ) : slots.length === 0 ? (
              <p className="text-sm text-slate-500 py-4">
                No times available on this day.
              </p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {slots.map((slot) => {
                  const iso = `${isoDate(selectedDate)}T${slot.start_time}:00`;
                  const isSelected = selectedSlot === iso;
                  return (
                    <button
                      key={slot.start_time}
                      onClick={() => slot.available && setSelectedSlot(iso)}
                      disabled={!slot.available}
                      // Taken slots are shown struck through rather than
                      // removed: a grid that silently omits 2pm tells a
                      // customer nothing about why their preferred time is
                      // missing, which is what makes them telephone.
                      title={slot.reason ?? undefined}
                      className={clsx(
                        'py-2 px-2 rounded-brand border text-xs font-medium transition-colors',
                        !slot.available
                          ? 'bg-slate-50 text-slate-300 border-slate-100 line-through cursor-not-allowed'
                          : isSelected
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-surface text-slate-700 border-slate-200 hover:border-primary',
                      )}
                    >
                      {formatSlot(iso)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {selectedDate && selectedSlot && (
          <button
            onClick={() => setStep('confirm')}
            className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-brand hover:opacity-90 transition-opacity"
          >
            Continue
          </button>
        )}
      </div>
    );
  }

  // ── Step: confirm ─────────────────────────────────────────────────────────────

  if (step === 'confirm') {
    const apptDate = selectedSlot ? new Date(selectedSlot) : null;

    return (
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <button onClick={() => setStep('datetime')} className="text-slate-400 hover:text-primary transition-colors">
            <ChevronLeft size={20} />
          </button>
          <h2 className="font-bold text-slate-900 text-lg">Confirm Booking</h2>
        </div>

        <div className="rounded-brand border border-slate-200 p-4 space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Service</span>
            <span className="font-semibold text-slate-900">{selectedService?.name}</span>
          </div>
          {selectedStaff && (
            <div className="flex justify-between">
              <span className="text-slate-500">Staff</span>
              <span className="font-semibold text-slate-900">{selectedStaff.name}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-slate-500">Date</span>
            <span className="font-semibold text-slate-900">
              {apptDate?.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Time</span>
            <span className="font-semibold text-slate-900">{apptDate ? formatSlot(selectedSlot!) : ''}</span>
          </div>
          <div className="flex justify-between border-t border-slate-100 pt-3">
            <span className="text-slate-500">Price</span>
            <span className="font-bold text-primary">{formatCurrency(selectedService?.price ?? 0)}</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Notes <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any special requests or info for your appointment…"
            className="w-full px-3 py-2 border border-slate-200 rounded-brand text-sm focus:outline-none focus:border-primary resize-none"
          />
        </div>

        {!customer && (
          <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-brand p-3">
            You must be signed in to book.{' '}
            <a href={`/${storeSlug}/login?next=/${storeSlug}/book`} className="font-semibold underline">
              Sign in
            </a>
          </div>
        )}

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <button
          onClick={handleBook}
          disabled={loading || !customer}
          className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-brand hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {loading ? 'Booking…' : 'Confirm Appointment'}
        </button>
      </div>
    );
  }

  // ── Step: done ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col items-center text-center py-8 space-y-4">
      <CheckCircle size={56} className="text-emerald-500" />
      <h2 className="text-xl font-bold text-slate-900">Appointment Booked!</h2>
      <p className="text-sm text-slate-500 max-w-xs">
        Your appointment for <strong>{selectedService?.name}</strong> has been confirmed. We&apos;ll see you then!
      </p>
      <div className="flex gap-3 mt-2">
        <a
          href={`/${storeSlug}/account/appointments`}
          className="px-4 py-2 border border-primary text-primary text-sm font-semibold rounded-brand hover:bg-primary/5 transition-colors"
        >
          View Appointments
        </a>
        <a
          href={`/${storeSlug}`}
          className="px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-brand hover:opacity-90 transition-opacity"
        >
          Back to Store
        </a>
      </div>
    </div>
  );
}
