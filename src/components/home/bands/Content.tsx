'use client';

/**
 * The bands a shop fills with its own words and pictures.
 *
 * None of these existed: a merchant could rearrange stock and nothing else,
 * so every Xeboki shop said exactly what the template said. These are the
 * blocks a shop needs to sound like itself — a paragraph, a photograph, what
 * a customer said, the question everybody asks.
 *
 * Every one of them **renders nothing when it has nothing**. A band with an
 * empty heading and no body is worse than a gap: it is a hole in the page
 * that says the shop is unfinished.
 */
import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { ScrollRail } from '@/components/layout/ScrollRail';
import { bandWords, setting } from '@/lib/band-words';
import { inStore } from '@/lib/hero-slides';
import { Band, BAND_RHYTHM } from './Band';
import type { SectionProps } from '../types';

export function RichTextBand({ section, nested }: SectionProps) {
  const w = bandWords(section, {}, nested);
  const body = setting<string>(section, 'body', '');
  if (!w.title && !body) return null;
  const width = section.variant === 'narrow' ? 'max-w-2xl'
    : section.variant === 'wide' ? 'max-w-none' : 'max-w-3xl';
  return (
    <Band nested={nested}>
      <div className={`${width} ${section.variant === 'centred' ? 'mx-auto text-center' : ''}`}>
        {w.eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fg-subtle">
            {w.eyebrow}
          </p>
        )}
        {w.title && <h2 className="mt-3 text-3xl font-bold text-fg sm:text-4xl">{w.title}</h2>}
        {body && (
          <div className="mt-5 whitespace-pre-line text-base leading-relaxed text-fg-muted">
            {body}
          </div>
        )}
      </div>
    </Band>
  );
}

export function ImageTextBand({ section, ctx, nested }: SectionProps) {
  const w = bandWords(section, {}, nested);
  const body = setting<string>(section, 'body', '');
  const imageUrl = setting<string>(section, 'imageUrl', '');
  const ctaLabel = setting<string>(section, 'ctaLabel', '');
  const ctaUrl = inStore(setting<string>(section, 'ctaUrl', ''),
                         ctx.storeSlug, '');
  if (!imageUrl && !w.title && !body) return null;

  const words = (
    <div className="flex flex-col justify-center">
      {w.eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fg-subtle">
          {w.eyebrow}
        </p>
      )}
      {w.title && <h2 className="mt-3 text-3xl font-bold text-fg sm:text-4xl">{w.title}</h2>}
      {body && <p className="mt-4 whitespace-pre-line text-fg-muted">{body}</p>}
      {ctaLabel && ctaUrl && (
        <Link href={ctaUrl} className="mt-7 inline-block self-start rounded-brand bg-primary-solid px-7 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
          {ctaLabel}
        </Link>
      )}
    </div>
  );

  if (section.variant === 'overlay') {
    return (
      <section className="relative isolate">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {imageUrl && <img src={imageUrl} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover" />}
        <div className="absolute inset-0 -z-10 bg-black/45" />
        <div className={`mx-auto max-w-3xl px-4 text-center text-white sm:px-6 lg:px-8 ${BAND_RHYTHM}`}>
          {w.title && <h2 className="text-3xl font-bold sm:text-4xl">{w.title}</h2>}
          {body && <p className="mt-4 whitespace-pre-line text-white/85">{body}</p>}
          {ctaLabel && ctaUrl && (
            <Link href={ctaUrl} className="mt-7 inline-block rounded-brand bg-white px-7 py-3 text-sm font-semibold text-black">
              {ctaLabel}
            </Link>
          )}
        </div>
      </section>
    );
  }

  return (
    <Band nested={nested}>
      <div className="grid grid-cols-1 items-stretch gap-10 lg:grid-cols-2">
        {/* Words first in the DOM whichever side the picture sits, so a phone
            and a screen reader both get the heading before the photograph. */}
        {words}
        {imageUrl && (
          // The picture is positioned INSIDE a frame rather than sized by
          // itself. `h-full` in an auto-height grid row resolves to the
          // image's own natural height — a 588px-wide column rendered a
          // portrait photograph 882px tall and dragged the whole band with
          // it, leaving the words floating in the middle of an empty half.
          // The frame contributes only its minimum; the words decide the
          // rest, and the picture crops to fit.
          <div className={`relative min-h-[16rem] overflow-hidden rounded-brand ${
            section.variant === 'imageLeft' ? 'lg:order-first' : ''}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          </div>
        )}
      </div>
    </Band>
  );
}

export function GalleryBand({ section, nested }: SectionProps) {
  const w = bandWords(section, {}, nested);
  const images = setting<string[]>(section, 'images', []).filter(Boolean);
  if (images.length === 0) return null;

  if (section.variant === 'carousel') {
    return (
      <Band nested={nested}>
        {w.title && <SectionHeader {...w} reserveEyebrow={nested} />}
        <ScrollRail trackClassName="flex gap-4 pb-2">
          {images.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={src} alt="" className="h-64 w-80 flex-none rounded-brand object-cover" />
          ))}
        </ScrollRail>
      </Band>
    );
  }

  if (section.variant === 'strip') {
    return (
      <section>
        <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-4">
          {images.slice(0, 8).map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={src} alt="" className="aspect-square w-full bg-surface object-cover" />
          ))}
        </div>
      </section>
    );
  }

  const masonry = section.variant === 'masonry';
  return (
    <Band nested={nested}>
      {w.title && <SectionHeader {...w} reserveEyebrow={nested} />}
      <div className={masonry
        ? 'columns-2 gap-4 sm:columns-3 [&>img]:mb-4'
        : 'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4'}>
        {images.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={src} alt=""
            className={masonry
              ? 'w-full break-inside-avoid rounded-brand object-cover'
              : 'aspect-square w-full rounded-brand object-cover'} />
        ))}
      </div>
    </Band>
  );
}

interface Quote { body?: string; name?: string; detail?: string }

export function TestimonialsBand({ section, nested }: SectionProps) {
  const w = bandWords(section, { eyebrow: 'Reviews', title: 'What people say' }, nested);
  const quotes = setting<Quote[]>(section, 'quotes', [])
    .filter((q) => (q?.body ?? '').trim());
  if (quotes.length === 0) return null;

  const card = (q: Quote, i: number) => (
    <figure key={i} className="rounded-brand border border-line bg-surface p-6">
      <blockquote className="text-fg">“{q.body}”</blockquote>
      {(q.name || q.detail) && (
        <figcaption className="mt-4 text-sm text-fg-muted">
          <span className="font-semibold text-fg">{q.name}</span>
          {q.detail && <span> · {q.detail}</span>}
        </figcaption>
      )}
    </figure>
  );

  return (
    <Band nested={nested}>
      <SectionHeader {...w} reserveEyebrow={nested} />
      {section.variant === 'carousel' ? (
        <ScrollRail trackClassName="flex gap-4 pb-2">
          {quotes.map((q, i) => (
            <div key={i} className="w-80 flex-none">{card(q, i)}</div>
          ))}
        </ScrollRail>
      ) : section.variant === 'single' ? (
        <div className="mx-auto max-w-2xl text-center text-lg">{card(quotes[0], 0)}</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quotes.map(card)}
        </div>
      )}
    </Band>
  );
}

interface QA { q?: string; a?: string }

export function FaqBand({ section, nested }: SectionProps) {
  const w = bandWords(section, { title: 'Questions' }, nested);
  const items = setting<QA[]>(section, 'items', [])
    .filter((i) => (i?.q ?? '').trim());
  if (items.length === 0) return null;

  if (section.variant === 'twoColumn') {
    return (
      <Band nested={nested}>
        <SectionHeader {...w} reserveEyebrow={nested} />
        <dl className="grid grid-cols-1 gap-8 sm:grid-cols-2">
          {items.map((item, i) => (
            <div key={i}>
              <dt className="font-semibold text-fg">{item.q}</dt>
              <dd className="mt-2 whitespace-pre-line text-fg-muted">{item.a}</dd>
            </div>
          ))}
        </dl>
      </Band>
    );
  }

  return (
    <Band nested={nested}>
      <SectionHeader {...w} reserveEyebrow={nested} />
      <div className="mx-auto max-w-3xl divide-y divide-line border-y border-line">
        {items.map((item, i) => <FaqRow key={i} item={item} />)}
      </div>
    </Band>
  );
}

function FaqRow({ item }: { item: QA }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 py-4 text-left font-semibold text-fg"
      >
        {item.q}
        <ChevronDown size={18} className={`flex-none transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <p className="whitespace-pre-line pb-5 text-fg-muted">{item.a}</p>
      )}
    </div>
  );
}

interface Stat { value?: string; label?: string }

export function StatsBand({ section, nested }: SectionProps) {
  const w = bandWords(section, {}, nested);
  const items = setting<Stat[]>(section, 'items', [])
    .filter((s) => (s?.value ?? '').trim());
  if (items.length === 0) return null;
  return (
    <Band nested={nested} tight>
      {w.title && <SectionHeader {...w} reserveEyebrow={nested} />}
      <dl className={`grid gap-8 ${section.variant === 'grid'
        ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2 sm:grid-cols-4'}`}>
        {items.map((s, i) => (
          <div key={i} className="text-center">
            <dt className="text-3xl font-bold text-fg sm:text-4xl">{s.value}</dt>
            <dd className="mt-1 text-sm text-fg-muted">{s.label}</dd>
          </div>
        ))}
      </dl>
    </Band>
  );
}

interface Member { name?: string; role?: string; imageUrl?: string }

export function TeamBand({ section, nested }: SectionProps) {
  const w = bandWords(section, { eyebrow: 'The people', title: 'Who you will meet' }, nested);
  const members = setting<Member[]>(section, 'members', [])
    .filter((m) => (m?.name ?? '').trim());
  if (members.length === 0) return null;

  const card = (m: Member, i: number) => (
    <div key={i} className="text-center">
      {m.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={m.imageUrl} alt="" className="mx-auto aspect-square w-32 rounded-full object-cover" />
      ) : (
        // An edge, not just a fill. On a light theme `surface-alt` sits at
        // 241/245/249 against a white page — about 1.09:1 — so a bare
        // placeholder is invisible and the name below it reads as a gap in
        // the layout rather than a person without a photograph.
        <div className="mx-auto aspect-square w-32 rounded-full border border-line bg-surface-alt" />
      )}
      <p className="mt-4 font-semibold text-fg">{m.name}</p>
      {/* The line is kept whether or not this person has a role, so three
          people in a row are three cards of the same height. */}
      <p className="min-h-[1.25rem] text-sm text-fg-muted">{m.role || '\u00a0'}</p>
    </div>
  );

  return (
    <Band nested={nested}>
      <SectionHeader {...w} reserveEyebrow={nested} />
      {section.variant === 'carousel' ? (
        <ScrollRail trackClassName="flex gap-8 pb-2">
          {members.map((m, i) => <div key={i} className="w-40 flex-none">{card(m, i)}</div>)}
        </ScrollRail>
      ) : (
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-4">
          {members.map(card)}
        </div>
      )}
    </Band>
  );
}
