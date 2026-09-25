import type { WeeklyHours, Weekday } from '@xeboki/sdk';

const DAYS: { key: Weekday; label: string }[] = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

/**
 * Trading hours, listing only the days the merchant actually set.
 *
 * A day nobody filled in is left out rather than shown as closed — claiming a
 * shop is shut on a day it may well be open costs the merchant the visit.
 */
export function OpeningHoursTable({ hours }: { hours: WeeklyHours }) {
  const known = DAYS.filter((d) => hours[d.key]);
  if (known.length === 0) return null;

  return (
    <dl className="mt-2 space-y-1 text-sm">
      {known.map(({ key, label }) => {
        const slot = hours[key]!;
        return (
          <div key={key} className="flex justify-between gap-4">
            <dt className="text-fg-muted">{label}</dt>
            <dd className={slot.closed ? 'text-fg-muted' : 'text-fg'}>
              {slot.closed ? 'Closed' : `${slot.opens} – ${slot.closes}`}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
