'use client';

/**
 * The bands that sell something rather than say something: a promotion, a
 * countdown, an email sign-up, the brands carried, a video.
 *
 * Same rule as the content bands — nothing configured renders nothing. A
 * countdown with no end date is not a countdown, and a promotion with no
 * picture and no words is a band of empty page.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { ScrollRail } from '@/components/layout/ScrollRail';
import { bandWords, setting } from '@/lib/band-words';
import { Band } from './Band';
import type { SectionProps } from '../types';

export function AnnouncementBand({ section, nested }: SectionProps) {
  const w = bandWords(section, {});
  if (!w.title) return null;
  const deep = section.variant === 'band';
  return (
    <div className={`bg-primary-solid text-center text-primary-foreground ${deep ? 'py-4' : 'py-2'}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className={deep ? 'text-base font-semibold' : 'text-sm'}>{w.title}</p>
        {deep && w.lede && <p className="mt-1 text-sm opacity-90">{w.lede}</p>}
      </div>
    </div>
  );
}

export function PromoBand({ section, nested }: SectionProps) {
  const w = bandWords(section, {});
  const imageUrl = setting<string>(section, 'imageUrl', '');
  const ctaLabel = setting<string>(section, 'ctaLabel', '');
  const ctaUrl = setting<string>(section, 'ctaUrl', '');
  if (!w.title && !imageUrl) return null;

  const inner = (
    <>
      {w.eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-80">{w.eyebrow}</p>
      )}
      {w.title && <h2 className="mt-2 text-3xl font-bold sm:text-4xl">{w.title}</h2>}
      {w.lede && <p className="mt-3 opacity-90">{w.lede}</p>}
      {ctaLabel && ctaUrl && (
        <Link href={ctaUrl} className="mt-6 inline-block rounded-brand bg-white px-7 py-3 text-sm font-semibold text-black">
          {ctaLabel}
        </Link>
      )}
    </>
  );

  if (section.variant === 'split') {
    return (
      <section className="border-t border-line">
        <div className="mx-auto grid max-w-7xl grid-cols-1 lg:grid-cols-2">
          <div className="flex flex-col justify-center bg-primary-solid px-8 py-16 text-primary-foreground lg:px-14">
            {inner}
          </div>
          {imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="h-full min-h-[18rem] w-full object-cover" />
          )}
        </div>
      </section>
    );
  }

  if (section.variant === 'card') {
    return (
      <Band nested={nested}>
        <div className="overflow-hidden rounded-brand bg-primary-solid px-8 py-14 text-center text-primary-foreground">
          {inner}
        </div>
      </Band>
    );
  }

  return (
    <section className="relative isolate border-t border-line">
      {imageUrl && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover" />
          <div className="absolute inset-0 -z-10 bg-black/50" />
        </>
      )}
      <div className={`mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 lg:px-8 ${
        imageUrl ? 'text-white' : 'bg-primary-solid text-primary-foreground'}`}>
        {inner}
      </div>
    </section>
  );
}

/**
 * A sale with an end on it.
 *
 * Counts down in the SHOPPER's browser, not on the server. The page is cached
 * for five minutes, so a server-rendered clock would be up to five minutes
 * wrong and would sit there being wrong — which is worse than no clock on the
 * one thing a shopper is watching.
 *
 * Past the end it renders nothing rather than a row of zeroes: the sale is
 * over, and a dead clock on a live page is how a shop looks abandoned.
 */
export function CountdownBand({ section, nested }: SectionProps) {
  const w = bandWords(section, {});
  const endsAt = setting<string>(section, 'endsAt', '');
  const ctaLabel = setting<string>(section, 'ctaLabel', '');
  const ctaUrl = setting<string>(section, 'ctaUrl', '');
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!endsAt) return;
    const end = new Date(endsAt).getTime();
    if (Number.isNaN(end)) return;
    const tick = () => setLeft(end - Date.now());
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [endsAt]);

  if (!endsAt || left === null || left <= 0) return null;

  const days = Math.floor(left / 86400000);
  const hours = Math.floor((left % 86400000) / 3600000);
  const mins = Math.floor((left % 3600000) / 60000);
  const secs = Math.floor((left % 60000) / 1000);
  const parts: [number, string][] = [[days, 'days'], [hours, 'hrs'], [mins, 'min'], [secs, 'sec']];

  const clock = (
    <div className="flex items-center gap-4">
      {parts.map(([value, label]) => (
        <div key={label} className="text-center">
          <div className="text-2xl font-bold tabular-nums">{String(value).padStart(2, '0')}</div>
          <div className="text-[0.65rem] uppercase tracking-wider opacity-75">{label}</div>
        </div>
      ))}
    </div>
  );

  if (section.variant === 'band') {
    return (
      <section className="border-y border-line bg-surface-alt py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 text-center sm:px-6 lg:px-8">
          {w.title && <h2 className="text-3xl font-bold text-fg">{w.title}</h2>}
          {w.lede && <p className="text-fg-muted">{w.lede}</p>}
          <div className="text-fg">{clock}</div>
          {ctaLabel && ctaUrl && (
            <Link href={ctaUrl} className="rounded-brand bg-primary-solid px-7 py-3 text-sm font-semibold text-primary-foreground">
              {ctaLabel}
            </Link>
          )}
        </div>
      </section>
    );
  }

  return (
    <div className="bg-fg py-3 text-surface">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-4 px-4 sm:flex-row sm:px-6 lg:px-8">
        {w.title && <span className="text-sm font-semibold">{w.title}</span>}
        {clock}
        {ctaLabel && ctaUrl && (
          <Link href={ctaUrl} className="text-sm font-semibold underline">{ctaLabel}</Link>
        )}
      </div>
    </div>
  );
}

export function NewsletterBand({ section, nested }: SectionProps) {
  const w = bandWords(section, {
    title: 'Hear about it first',
    lede: 'New arrivals and offers, now and then. No more than that.',
    linkLabel: 'Sign up',
  });
  // Posts to the same place the footer's sign-up does, so there is one list.
  const form = (
    <form className="flex w-full max-w-md gap-2" action={`/api/subscribe`} method="post">
      <input
        type="email"
        name="email"
        required
        placeholder="you@example.com"
        aria-label="Email address"
        className="min-w-0 flex-1 rounded-brand border border-line bg-surface px-4 py-2.5 text-sm text-fg"
      />
      <button type="submit" className="flex-none rounded-brand bg-primary-solid px-5 py-2.5 text-sm font-semibold text-primary-foreground">
        {w.linkLabel}
      </button>
    </form>
  );

  if (section.variant === 'bar') {
    return (
      <section className="border-y border-line bg-surface-alt py-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-8">
          <p className="font-semibold text-fg">{w.title}</p>
          {form}
        </div>
      </section>
    );
  }

  if (section.variant === 'split') {
    return (
      <Band nested={nested}>
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold text-fg">{w.title}</h2>
            {w.lede && <p className="mt-3 text-fg-muted">{w.lede}</p>}
          </div>
          <div className="lg:justify-self-end">{form}</div>
        </div>
      </Band>
    );
  }

  return (
    // `fill`, so a sign-up card beside a map or a picture matches its height
    // instead of floating at the top of the column with a hole beneath it.
    <Band nested={nested} fill>
      {/* `p-6` on a phone, not `p-10`. Forty pixels of padding each side of a
          390px screen left the email field too narrow for the placeholder it
          carries, which came out as "you@example.cor". */}
      <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center gap-5 rounded-brand border border-line bg-surface-alt p-6 text-center sm:p-10">
        <h2 className="text-2xl font-bold text-fg">{w.title}</h2>
        {w.lede && <p className="text-fg-muted">{w.lede}</p>}
        {form}
      </div>
    </Band>
  );
}

export function LogosBand({ section, nested }: SectionProps) {
  const w = bandWords(section, {});
  const images = setting<string[]>(section, 'images', []).filter(Boolean);
  if (images.length === 0) return null;
  return (
    <Band nested={nested} tight>
      {w.title && <SectionHeader {...w} />}
      <div className={section.variant === 'grid'
        ? 'grid grid-cols-3 items-center gap-8 sm:grid-cols-5'
        : 'flex flex-wrap items-center justify-center gap-10'}>
        {images.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={src} alt="" className="h-10 w-auto object-contain opacity-70" />
        ))}
      </div>
    </Band>
  );
}

/**
 * One video.
 *
 * A YouTube or Vimeo link, turned into the embed address. Anything else is
 * left alone and rendered nothing — an arbitrary URL in an iframe on a
 * merchant's shop is somebody else's page inside theirs.
 */
export function VideoBand({ section, nested }: SectionProps) {
  const w = bandWords(section, {});
  const url = setting<string>(section, 'videoUrl', '');
  const embed = embedUrl(url);
  if (!embed) return null;

  const frame = (
    <div className="aspect-video w-full overflow-hidden rounded-brand bg-black">
      <iframe
        src={embed}
        title={w.title || 'Video'}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="h-full w-full"
      />
    </div>
  );

  if (section.variant === 'split') {
    return (
      <Band nested={nested}>
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
          <div>
            {w.title && <h2 className="text-3xl font-bold text-fg">{w.title}</h2>}
            {w.lede && <p className="mt-3 text-fg-muted">{w.lede}</p>}
          </div>
          {frame}
        </div>
      </Band>
    );
  }
  return (
    <Band nested={nested}>
      {w.title && <SectionHeader {...w} />}
      {frame}
    </Band>
  );
}

function embedUrl(raw: string): string | null {
  const url = (raw || '').trim();
  if (!url) return null;
  const youtube = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{6,})/);
  if (youtube) return `https://www.youtube.com/embed/${youtube[1]}`;
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}
