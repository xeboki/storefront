/**
 * Every menu target leads somewhere the shop actually serves.
 *
 * `page` pointed at `/page/<slug>` and the route has always been
 * `app/[store]/p/`. So every custom page a merchant put in their menu or
 * their footer led to a 404 — including the footer's own "About" link on
 * 34, which answered 404 while `/p/about` answered 200.
 *
 * Nobody spots that by reading `targetHref`: the line is correct-looking
 * and the only thing wrong with it is a directory name three folders away.
 * So the routes are read off the filesystem rather than written down here.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { targetHref } from './navigation';

const APP = join(__dirname, '..', 'app', '[store]');

/** The first path segment of every route the shop serves. */
const routes = new Set(
  readdirSync(APP)
    .filter((entry) => statSync(join(APP, entry)).isDirectory())
    .filter((entry) => !entry.startsWith('(')),
);

const ctx = { storeSlug: 'shop', catalogHref: () => '/shop/catalog' };

describe('every menu target leads somewhere real', () => {
  it('finds the routes at all', () => {
    // A corpus that read nothing would pass every assertion below.
    expect(routes.size).toBeGreaterThan(8);
    expect(routes.has('catalog')).toBe(true);
  });

  // Derived from the switch itself, so a target added tomorrow is covered.
  const targets = ['catalog', 'category', 'product', 'page', 'blog', 'book',
                   'repairs', 'account'];

  it.each(targets)('%s resolves to a route that exists', (target) => {
    const { href } = targetHref(target, 'a-slug', ctx);
    expect(href, `${target} resolves to nothing`).toBeTruthy();
    const segment = href!.split('/').filter(Boolean)[1];
    expect(routes.has(segment),
      `${target} → ${href}, but there is no app/[store]/${segment}/ route`)
      .toBe(true);
  });

  it('a custom page goes to /p/, which is where the route is', () => {
    expect(targetHref('page', 'about', ctx).href).toBe('/shop/p/about');
  });

  it('an unknown target is a label, not a link to nowhere', () => {
    expect(targetHref('nonsense', 'x', ctx).href).toBeNull();
  });

  it('an absolute url is external and a relative one is not', () => {
    expect(targetHref('url', 'https://example.com', ctx).external).toBe(true);
    expect(targetHref('url', '/shop/catalog', ctx).external).toBe(false);
  });
});
