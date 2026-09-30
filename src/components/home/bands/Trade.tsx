/**
 * The bands only a particular trade can fill.
 *
 * A menu is a kitchen's shop window; a timetable is what a gym sells; a
 * priced service list is what somebody books a salon from. Drawing these from
 * the catalogue the till already keeps means the merchant maintains them once,
 * at the till, rather than twice.
 *
 * Each renders nothing when the catalogue has nothing to put in it, which is
 * also what a shop looks like before it has set itself up.
 */
import Link from 'next/link';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { bandWords, setting } from '@/lib/band-words';
import { Band } from './Band';
import type { SectionProps } from '../types';

/**
 * The food, by course.
 *
 * A menu is the catalogue grouped by department, which is how a kitchen
 * already keeps it at the till — starters, mains, puddings are its
 * categories. So this is not a second place to maintain the menu; it is the
 * same list, read.
 */
export function MenuBand({ section, ctx }: SectionProps) {
  const w = bandWords(section, { eyebrow: 'The menu', title: 'What we serve' });
  const chosen = setting<string[]>(section, 'categoryIds', []);
  const courses = (chosen.length
    ? chosen.map((id) => ctx.categories.find((c) => c.id === id))
        .filter((c): c is NonNullable<typeof c> => Boolean(c))
    : ctx.shownCategories)
    .map((c) => ({ course: c, items: ctx.products.filter((p) => p.categoryId === c.id) }))
    .filter((c) => c.items.length > 0);
  if (courses.length === 0) return null;

  if (section.variant === 'grid') {
    return (
      <Band>
        <SectionHeader {...w} href={`/${ctx.storeSlug}/catalog`} />
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map(({ course, items }) => (
            <div key={course.id}>
              <h3 className="border-b border-line pb-2 text-lg font-bold text-fg">{course.name}</h3>
              <ul className="mt-3 space-y-2">
                {items.map((item) => (
                  <li key={item.id} className="flex justify-between gap-4 text-sm">
                    <span className="text-fg">{item.name}</span>
                    <span className="flex-none text-fg-muted">{item.price}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Band>
    );
  }

  const flat = section.variant === 'list';
  return (
    <Band>
      <SectionHeader {...w} href={`/${ctx.storeSlug}/catalog`} />
      <div className={flat ? 'mx-auto max-w-3xl' : 'mx-auto max-w-4xl space-y-12'}>
        {courses.map(({ course, items }) => (
          <div key={course.id}>
            {!flat && (
              <h3 className="text-center text-2xl font-bold text-fg">{course.name}</h3>
            )}
            {flat && (
              <h3 className="mt-8 border-b border-line pb-2 text-sm font-semibold uppercase tracking-wider text-fg-muted">
                {course.name}
              </h3>
            )}
            <ul className={flat ? 'divide-y divide-line' : 'mt-6 space-y-4'}>
              {items.map((item) => (
                <li key={item.id} className="flex items-baseline justify-between gap-4 py-3">
                  <div>
                    <p className="font-medium text-fg">{item.name}</p>
                    {item.description && (
                      <p className="mt-0.5 text-sm text-fg-muted">{item.description}</p>
                    )}
                  </div>
                  <span className="flex-none font-semibold text-fg">{item.price}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Band>
  );
}

/**
 * What is offered and what it costs, with a way to book it.
 *
 * The same catalogue again — a salon's services ARE its products — but shown
 * the way somebody chooses a treatment rather than the way they buy a thing:
 * price beside name, and a booking link on every row.
 */
export function ServicesBand({ section, ctx }: SectionProps) {
  const w = bandWords(section, {
    eyebrow: 'What we do', title: 'Services', linkLabel: 'Book',
  });
  const limit = setting<number>(section, 'limit', 0);
  const chosen = setting<string[]>(section, 'categoryIds', []);
  const pool = chosen.length
    ? ctx.products.filter((p) => p.categoryId && chosen.includes(p.categoryId))
    : ctx.products;
  const list = limit > 0 ? pool.slice(0, limit) : pool;
  if (list.length === 0) return null;

  if (section.variant === 'list') {
    return (
      <Band>
        <SectionHeader {...w} href={`/${ctx.storeSlug}/book`} />
        <ul className="mx-auto max-w-3xl divide-y divide-line border-y border-line">
          {list.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-6 py-4">
              <div>
                <p className="font-medium text-fg">{item.name}</p>
                {item.description && (
                  <p className="mt-0.5 text-sm text-fg-muted">{item.description}</p>
                )}
              </div>
              <div className="flex flex-none items-center gap-4">
                <span className="font-semibold text-fg">{item.price}</span>
                <Link href={`/${ctx.storeSlug}/book`}
                  className="rounded-brand border border-primary px-4 py-1.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/5">
                  {w.linkLabel}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </Band>
    );
  }

  const cards = section.variant === 'cards';
  return (
    <Band>
      <SectionHeader {...w} href={`/${ctx.storeSlug}/book`} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((item) => (
          <div key={item.id}
            className={`rounded-brand border border-line bg-surface p-5 ${cards ? 'flex flex-col' : ''}`}>
            {cards && item.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.imageUrl} alt=""
                className="mb-4 aspect-[3/2] w-full rounded-brand object-cover" />
            )}
            <p className="font-semibold text-fg">{item.name}</p>
            {item.description && (
              <p className="mt-1 text-sm text-fg-muted">{item.description}</p>
            )}
            <div className="mt-4 flex items-center justify-between">
              <span className="font-semibold text-fg">{item.price}</span>
              <Link href={`/${ctx.storeSlug}/book`}
                className="text-sm font-semibold text-primary hover:underline">
                {w.linkLabel}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </Band>
  );
}

/**
 * What is on this week.
 *
 * Deliberately a LINK to the classes page rather than a copy of the
 * timetable. Class sessions are dated and change daily; this page is cached
 * for five minutes and a stale timetable is worse than none — somebody turns
 * up for a class that was cancelled. So the band says what a shopper needs to
 * decide to look, and the live list lives where it is live.
 */
export function TimetableBand({ section, ctx }: SectionProps) {
  const w = bandWords(section, {
    eyebrow: 'This week',
    title: 'Classes',
    lede: 'See what is on and book your place.',
    linkLabel: 'View the timetable',
  });
  return (
    <Band>
      <div className="mx-auto max-w-2xl text-center">
        {w.eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fg-subtle">
            {w.eyebrow}
          </p>
        )}
        <h2 className="mt-3 text-3xl font-bold text-fg">{w.title}</h2>
        {w.lede && <p className="mt-3 text-fg-muted">{w.lede}</p>}
        <Link href={`/${ctx.storeSlug}/classes`}
          className="mt-7 inline-block rounded-brand bg-primary-solid px-7 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
          {w.linkLabel}
        </Link>
      </div>
    </Band>
  );
}

/** The branches somebody can walk into. */
export function LocationsBand({ section, ctx }: SectionProps) {
  const w = bandWords(section, { eyebrow: 'Find us', title: 'Where to find us' });
  const branches = ctx.storefrontConfig?.fulfillmentLocations ?? [];
  if (branches.length === 0) return null;
  const list = section.variant === 'single' ? branches.slice(0, 1) : branches;

  return (
    <Band>
      <SectionHeader {...w} href={`/${ctx.storeSlug}/locations`} />
      <div className={`grid gap-6 ${list.length > 1
        ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 max-w-xl'}`}>
        {list.map((branch) => {
          // The same three fields the Locations page reads, resolved the same
          // way — `locationName` else the city, and the pickup address, which
          // is the only address a branch actually carries.
          const name = branch.locationName || branch.city || 'Store';
          const address = branch.pickupAddress || branch.city || '';
          return (
            <div key={branch.locationId} className="rounded-brand border border-line bg-surface p-5">
              <p className="font-semibold text-fg">{name}</p>
              {address && <p className="mt-1 text-sm text-fg-muted">{address}</p>}
              {section.variant === 'map' && address && (
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(address)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-block text-sm font-semibold text-primary hover:underline"
                >
                  Open in maps
                </a>
              )}
            </div>
          );
        })}
      </div>
    </Band>
  );
}

/** How to reach the shop without buying anything. */
export function ContactBand({ section, ctx }: SectionProps) {
  const w = bandWords(section, {
    title: 'Get in touch',
    lede: 'Questions about an order, a booking, or anything else.',
  });
  const email = ctx.storeConfig.supportEmail || '';
  const phone = ctx.storeConfig.supportPhone || '';
  if (!email && !phone) return null;

  const details = (
    <dl className="space-y-3 text-sm">
      {phone && (
        <div>
          <dt className="text-fg-subtle">Phone</dt>
          <dd><a href={`tel:${phone}`} className="font-medium text-fg hover:text-primary">{phone}</a></dd>
        </div>
      )}
      {email && (
        <div>
          <dt className="text-fg-subtle">Email</dt>
          <dd><a href={`mailto:${email}`} className="font-medium text-fg hover:text-primary">{email}</a></dd>
        </div>
      )}
    </dl>
  );

  if (section.variant === 'card') {
    return (
      <Band>
        <div className="mx-auto max-w-xl rounded-brand border border-line bg-surface-alt p-8 text-center">
          <h2 className="text-2xl font-bold text-fg">{w.title}</h2>
          {w.lede && <p className="mt-2 text-fg-muted">{w.lede}</p>}
          <div className="mt-6 flex justify-center">{details}</div>
        </div>
      </Band>
    );
  }

  return (
    <Band>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div>
          <h2 className="text-3xl font-bold text-fg">{w.title}</h2>
          {w.lede && <p className="mt-3 text-fg-muted">{w.lede}</p>}
        </div>
        <div className="lg:justify-self-end">{details}</div>
      </div>
    </Band>
  );
}
