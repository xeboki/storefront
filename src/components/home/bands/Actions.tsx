/**
 * The bands that ask for something: book, track, quote, reserve, send a
 * prescription — and the age notice, which asks nothing and states a fact.
 *
 * All of them are the same shape underneath, because they are the same thing:
 * a sentence and a button. What differs is the trade that can fill it and the
 * page it points at, so they share one component and differ by their words.
 */
import Link from 'next/link';
import { bandWords } from '@/lib/band-words';
import type { SectionProps } from '../types';
import { BAND_RHYTHM_TIGHT } from './Band';

/**
 * A sentence and a button, in one of three weights.
 *
 * `bar` is the thin strip the page already used, `card` lifts it off the
 * page, `split` gives it half the width. A merchant picks the weight; the
 * words and the destination are the band's business.
 */
function CallToAction({
  variant, title, lede, label, href, tone = 'primary',
}: {
  variant: string; title: string; lede: string; label: string;
  href: string; tone?: 'primary' | 'quiet';
}) {
  const button = tone === 'primary'
    ? 'bg-primary-solid text-primary-foreground hover:opacity-90'
    : 'border border-primary text-primary hover:bg-primary/5';

  if (variant === 'card') {
    return (
      <section className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 ${BAND_RHYTHM_TIGHT}`}>
        <div className="rounded-brand border border-line bg-surface-alt p-8 text-center">
          <h2 className="display-md text-fg">{title}</h2>
          {lede && <p className="mx-auto mt-2 max-w-xl text-fg-muted">{lede}</p>}
          <Link href={href} className={`mt-6 inline-block rounded-brand px-7 py-3 text-sm font-semibold transition-opacity ${button}`}>
            {label}
          </Link>
        </div>
      </section>
    );
  }

  if (variant === 'split') {
    return (
      <section className="bg-surface-alt">
        <div className={`mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8 ${BAND_RHYTHM_TIGHT}`}>
          <div>
            <h2 className="display-lg text-fg">{title}</h2>
            {lede && <p className="mt-3 text-fg-muted">{lede}</p>}
          </div>
          <div className="lg:justify-self-end">
            <Link href={href} className={`inline-block rounded-brand px-8 py-3.5 text-sm font-semibold transition-opacity ${button}`}>
              {label}
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="border-b border-primary/10 bg-primary/5 py-6">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-8">
        <div>
          <h2 className="text-lg font-bold text-fg">{title}</h2>
          {lede && <p className="mt-0.5 text-sm text-fg-muted">{lede}</p>}
        </div>
        <Link href={href} className={`flex-shrink-0 rounded-brand px-6 py-2.5 text-sm font-semibold transition-opacity ${button}`}>
          {label}
        </Link>
      </div>
    </section>
  );
}

export function BookingBand({ section, ctx }: SectionProps) {
  const w = bandWords(section, {
    title: 'Book an Appointment',
    lede: 'Choose your service, staff, and time — online in seconds.',
    linkLabel: 'Book Now',
  });
  return <CallToAction variant={section.variant} title={w.title} lede={w.lede}
    label={w.linkLabel} href={`/${ctx.storeSlug}/book`} />;
}

export function WorkOrderBand({ section, ctx }: SectionProps) {
  const w = bandWords(section, {
    title: 'Track Your Order',
    lede: 'Enter your ticket number to see the status of your repair or job.',
    linkLabel: 'Track Order',
  });
  return <CallToAction variant={section.variant} title={w.title} lede={w.lede}
    label={w.linkLabel} href={`/${ctx.storeSlug}/repairs`} tone="quiet" />;
}

export function RepairEstimateBand({ section, ctx }: SectionProps) {
  const w = bandWords(section, {
    title: 'What will it cost?',
    lede: 'Tell us the device and the fault, and get a price before you come in.',
    linkLabel: 'Get a quote',
  });
  return <CallToAction variant={section.variant} title={w.title} lede={w.lede}
    label={w.linkLabel} href={`/${ctx.storeSlug}/repair-estimate`} />;
}

export function ReservationBand({ section, ctx }: SectionProps) {
  const w = bandWords(section, {
    title: 'Book a table',
    lede: 'Reserve a time and we will keep it for you.',
    linkLabel: 'Reserve',
  });
  return <CallToAction variant={section.variant} title={w.title} lede={w.lede}
    label={w.linkLabel} href={`/${ctx.storeSlug}/book`} />;
}

export function PrescriptionBand({ section, ctx }: SectionProps) {
  const w = bandWords(section, {
    title: 'Send us your prescription',
    lede: 'We will check it and let you know when it is ready to collect.',
    linkLabel: 'Send it over',
  });
  return <CallToAction variant={section.variant} title={w.title} lede={w.lede}
    label={w.linkLabel} href={`/${ctx.storeSlug}/account`} tone="quiet" />;
}
