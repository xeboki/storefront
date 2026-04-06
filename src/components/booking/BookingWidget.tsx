'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { clsx } from 'clsx';
import { ChevronLeft, ChevronRight, Calendar, Clock, User, CheckCircle } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { formatCurrency } from '@/lib/utils';
import type { OrderingProduct, OrderingStaff } from '@xeboki/sdk';

// ── Time slot helpers ──────────────────────────────────────────────────────────

function generateSlots(date: string): string[] {
  const slots: string[] = [];
  for (let h = 9; h <= 17; h++) {
    for (const m of [0, 30]) {
      if (h === 17 && m === 30) continue;
      const hh = String(h).padStart(2, '0');
      const mm = String(m).padStart(2, '0');
      slots.push(`${date}T${hh}:${mm}:00`);
    }
  }
  return slots;
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
  const slots = selectedDate ? generateSlots(isoDate(selectedDate)) : [];

  // Week days (7 days from viewStart)
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(viewStart, i));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookedAppt, setBookedAppt] = useState<{ id: string } | null>(null);

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
              const isSelected = selectedDate && isoDate(day) === isoDate(selectedDate);
              return (
                <button
                  key={isoDate(day)}
                  disabled={isPast}
                  onClick={() => setSelectedDate(day)}
                  className={clsx(
                    'flex flex-col items-center py-2 rounded-brand text-xs font-medium transition-colors',
                    isSelected
                      ? 'bg-primary text-primary-foreground'
                      : isPast
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
            <div className="grid grid-cols-4 gap-2">
              {slots.map((slot) => (
                <button
                  key={slot}
                  onClick={() => setSelectedSlot(slot)}
                  className={clsx(
                    'py-2 px-2 rounded-brand border text-xs font-medium transition-colors',
                    selectedSlot === slot
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-surface text-slate-700 border-slate-200 hover:border-primary',
                  )}
                >
                  {formatSlot(slot)}
                </button>
              ))}
            </div>
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
