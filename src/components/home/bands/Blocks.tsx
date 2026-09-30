'use client';

/**
 * The blocks a column is built from.
 *
 * These are what the full-width bands could never be: a coloured card narrow
 * enough to title the carousel beside it, a picture tile sized to whatever
 * column it lands in, a short vertical list of products to sit next to a
 * wider grid. None of them assume the width of the page, because none of them
 * has it.
 */
import Link from 'next/link';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { bandWords, setting } from '@/lib/band-words';
import { Band } from './Band';
import type { SectionProps } from '../types';

/**
 * A block of colour with a heading and a button.
 *
 * The block every reference layout uses to title the carousel beside it —
 * "Furniture / this month's specials" in a pastel card at a quarter width,
 * with the products taking the rest.
 */
export function TextCardBlock({ section, nested }: SectionProps) {
  const w = bandWords(section, {});
  const body = setting<string>(section, 'body', '');
  const colour = setting<string>(section, 'backgroundColor', '');
  const ctaLabel = setting<string>(section, 'ctaLabel', '');
  const ctaUrl = setting<string>(section, 'ctaUrl', '');
  if (!w.title && !body) return null;

  const solid = section.variant === 'solid';
  const tint = section.variant === 'tint';
  const outline = section.variant === 'outline';
  // A merchant's colour, or the shop's own. Only the solid card puts words on
  // it, so only the solid card has to worry about what they sit on.
  // A merchant's colour is taken at full strength for the solid card and at a
  // tenth for the tint, so one chosen colour gives both treatments without
  // asking anybody to pick a second, paler version of it.
  const style = colour && !outline
    ? tint
      ? { backgroundColor: `${colour}1a` }
      : { backgroundColor: colour, color: '#fff' }
    : undefined;

  return (
    <Band nested={nested} bordered={false} tight>
      <div
        style={style}
        className={`flex h-full flex-col justify-center rounded-brand p-8 ${
          outline ? 'border border-line'
            : colour ? ''
              : tint ? 'bg-surface-alt text-fg'
                : 'bg-primary-solid text-primary-foreground'}`}
      >
        {w.eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-75">
            {w.eyebrow}
          </p>
        )}
        {w.title && <h2 className="mt-2 text-2xl font-bold leading-tight">{w.title}</h2>}
        {body && <p className="mt-3 text-sm opacity-90">{body}</p>}
        {ctaLabel && ctaUrl && (
          <Link
            href={ctaUrl}
            className={`mt-6 inline-block self-start rounded-brand px-5 py-2.5 text-sm font-semibold ${
              solid ? 'bg-white text-black' : 'bg-primary-solid text-primary-foreground'}`}
          >
            {ctaLabel}
          </Link>
        )}
      </div>
    </Band>
  );
}

/**
 * One picture with words on it, sized to its column.
 *
 * The block a shop stacks two of beside a big banner. Its height is a named
 * size rather than a number — a tile told to be 340px tall is a tile that
 * breaks the row it is in the moment somebody changes the column beside it.
 */
export function TileBlock({ section, nested }: SectionProps) {
  const w = bandWords(section, {});
  const imageUrl = setting<string>(section, 'imageUrl', '');
  const body = setting<string>(section, 'body', '');
  const ctaLabel = setting<string>(section, 'ctaLabel', '');
  const ctaUrl = setting<string>(section, 'ctaUrl', '');
  const height = setting<string>(section, 'height', 'medium');
  if (!imageUrl && !w.title) return null;

  const tall = { short: 'min-h-[12rem]', medium: 'min-h-[18rem]', tall: 'min-h-[26rem]' }[height]
    ?? 'min-h-[18rem]';

  const words = (
    <>
      {w.eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-80">{w.eyebrow}</p>
      )}
      {w.title && <h3 className="mt-1 text-2xl font-bold leading-tight">{w.title}</h3>}
      {body && <p className="mt-2 text-sm opacity-90">{body}</p>}
      {ctaLabel && ctaUrl && (
        <span className="mt-4 inline-block border-b border-current pb-0.5 text-sm font-semibold">
          {ctaLabel}
        </span>
      )}
    </>
  );

  const inner = section.variant === 'below' ? (
    <div className="flex h-full flex-col">
      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className={`w-full flex-1 rounded-brand object-cover ${tall}`} />
      )}
      <div className="pt-4 text-fg">{words}</div>
    </div>
  ) : (
    <div className={`relative isolate flex overflow-hidden rounded-brand ${tall} ${
      section.variant === 'corner' ? 'items-end' : 'items-center'}`}>
      {imageUrl && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover" />
          <div className="absolute inset-0 -z-10 bg-black/35" />
        </>
      )}
      <div className={`p-7 ${imageUrl ? 'text-white' : 'text-fg'} ${
        section.variant === 'corner' ? '' : 'max-w-sm'}`}>
        {words}
      </div>
    </div>
  );

  const content = ctaUrl
    ? <Link href={ctaUrl} className="block h-full">{inner}</Link>
    : inner;

  return <Band nested={nested} bordered={false} tight>{content}</Band>;
}

/**
 * Tiles of different sizes in one block.
 *
 * What a shop uses to offer four or five places to go at once without giving
 * each of them a band. The shapes are named, so a merchant arranges rather
 * than measures.
 */
export function MosaicBlock({ section, nested }: SectionProps) {
  const w = bandWords(section, {});
  interface Tile { imageUrl?: string; title?: string; body?: string; url?: string }
  const tiles = setting<Tile[]>(section, 'tiles', [])
    .filter((t) => (t?.title ?? '').trim() || (t?.imageUrl ?? '').trim());
  if (tiles.length === 0) return null;

  // Which tile gets the room, per shape. Everything beyond what the shape
  // names is drawn at the ordinary size rather than dropped — a merchant who
  // added a fifth tile meant to show it.
  const big = { 'feature-two': 0, 'wide-pair': 0, 'two-two': -1 }[section.variant] ?? 0;

  return (
    <Band nested={nested}>
      {w.title && <SectionHeader {...w} />}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((tile, i) => {
          const wide = section.variant === 'wide-pair' ? i === big : i === big;
          const span = section.variant === 'two-two'
            ? 'col-span-2'
            : wide ? 'col-span-2 row-span-2 lg:col-span-2' : 'col-span-1 lg:col-span-1';
          const content = (
            <div className={`relative isolate flex items-end overflow-hidden rounded-brand bg-surface-alt ${
              wide && section.variant !== 'two-two' ? 'min-h-[20rem]' : 'min-h-[10rem]'}`}>
              {tile.imageUrl && (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={tile.imageUrl} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover" />
                  <div className="absolute inset-0 -z-10 bg-black/30" />
                </>
              )}
              <div className={`p-5 ${tile.imageUrl ? 'text-white' : 'text-fg'}`}>
                {tile.title && <p className="text-lg font-bold leading-tight">{tile.title}</p>}
                {tile.body && <p className="mt-1 text-sm opacity-90">{tile.body}</p>}
              </div>
            </div>
          );
          return (
            <div key={i} className={span}>
              {tile.url ? <Link href={tile.url}>{content}</Link> : content}
            </div>
          );
        })}
      </div>
    </Band>
  );
}

/**
 * A narrow column of products, one under another.
 *
 * What a shop puts beside a wider grid to say "new in". Deliberately not the
 * product grid at a narrow width: a three-column grid squeezed into a third
 * of the page is three unreadable cards, and this is a list.
 */
export function ProductListBlock({ section, ctx, nested }: SectionProps) {
  const w = bandWords(section, {});
  const limit = setting<number>(section, 'limit', 4);
  const chosen = setting<string[]>(section, 'productIds', []);
  const pool = chosen.length
    ? chosen.map((id) => ctx.products.find((p) => p.id === id))
        .filter((p): p is NonNullable<typeof p> => Boolean(p))
    : ctx.products;
  const list = pool.slice(0, limit);
  if (list.length === 0) return null;

  return (
    <Band nested={nested} bordered={!nested}>
      {w.title && <SectionHeader {...w} href={`/${ctx.storeSlug}/catalog`} />}
      <ul className="divide-y divide-line border-y border-line">
        {list.map((product) => (
          <li key={product.id}>
            <Link
              href={`/${ctx.storeSlug}/product/${product.id}`}
              className="flex items-center gap-4 py-4 transition-colors hover:text-primary"
            >
              {product.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.imageUrl} alt=""
                  className="h-16 w-16 flex-none rounded-brand object-cover" />
              ) : (
                <div className="h-16 w-16 flex-none rounded-brand bg-surface-alt" />
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-fg">{product.name}</p>
                {section.variant === 'detailed' && (
                  <p className="mt-0.5 text-sm text-fg-muted">{product.price}</p>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </Band>
  );
}

/**
 * Where the shop is, on a map.
 *
 * An embed rather than a key-bearing script: a map on a shop's front page
 * needs no API key, no consent banner for a library nobody asked for, and
 * nothing that breaks the day a billing account lapses.
 */
export function MapBlock({ section, ctx, nested }: SectionProps) {
  const w = bandWords(section, {});
  const branch = (ctx.storefrontConfig?.fulfillmentLocations ?? [])[0];
  const address = setting<string>(section, 'address', '')
    || branch?.pickupAddress || branch?.city || '';
  if (!address) return null;
  const zoom = setting<number>(section, 'zoom', 14);

  return (
    <Band nested={nested} tight={nested} bordered={section.variant === 'framed'}>
      {w.title && <SectionHeader {...w} />}
      {/* `wide` runs the map edge to edge; `framed` keeps it inside the page
          margin with the rest of the content. Nested, it is always framed —
          a column has no edge to run to. */}
      <div className={`overflow-hidden border border-line ${
        section.variant === 'framed' || nested
          ? 'rounded-brand' : '-mx-4 sm:-mx-6 lg:-mx-8 rounded-none border-x-0'} ${
        nested ? 'h-72' : 'h-96'}`}>
        <iframe
          title={w.title || 'Map'}
          loading="lazy"
          className="h-full w-full"
          src={`https://maps.google.com/maps?q=${encodeURIComponent(address)}&z=${zoom}&output=embed`}
        />
      </div>
    </Band>
  );
}
