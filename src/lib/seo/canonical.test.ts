/**
 * One address per page, and every indexable page has one.
 *
 * **Nothing emitted a canonical link at all.** The catalogue alone serves
 * the same products under `?category=`, `?page=` and `?sort=`, and the
 * sitemap lists a dozen of those — so a shop was competing with itself for
 * its own words on every listing it had.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { canonicalUrl, shopOrigin } from './canonical';

const cfg = (over: Record<string, unknown> = {}) =>
  ({ customDomain: null, ...over }) as never;

describe('the one address a shop is indexed under', () => {
  it('is the subdomain when there is no custom domain', () => {
    expect(shopOrigin('gamebench', cfg())).toBe('https://gamebench.xeboki.store');
  });

  it('is the custom domain when there is one', () => {
    expect(shopOrigin('gamebench', cfg({ customDomain: 'shop.example' })))
      .toBe('https://shop.example');
  });

  it('does not double the scheme on a domain that already has one', () => {
    expect(shopOrigin('x', cfg({ customDomain: 'https://shop.example' })))
      .toBe('https://shop.example');
  });

  it('is never the host the request arrived on', () => {
    // A shop reachable at both its domain and its subdomain would
    // otherwise canonicalise to whichever one the crawler used, which is
    // the thing a canonical exists to stop.
    const source = readFileSync(join(__dirname, 'canonical.ts'), 'utf8');
    expect(source).not.toContain('headers()');
    expect(source).not.toContain('x-forwarded-host');
  });

  it('has no trailing slash to double up', () => {
    expect(shopOrigin('x', cfg({ customDomain: 'shop.example/' })))
      .not.toMatch(/\/$/);
  });
});

describe('a page’s canonical', () => {
  it('is the home page for an empty path', () => {
    expect(canonicalUrl('g', cfg())).toBe('https://g.xeboki.store/');
    expect(canonicalUrl('g', cfg(), '/')).toBe('https://g.xeboki.store/');
  });

  it('takes a path with or without its leading slash', () => {
    expect(canonicalUrl('g', cfg(), 'catalog'))
      .toBe(canonicalUrl('g', cfg(), '/catalog'));
  });

  it('keeps a query the caller put there', () => {
    // A category listing is worth indexing on its own — "olive oil" is a
    // real search, and the sitemap lists one per category. Stripping it
    // would tell a crawler to index those entries and then that none of
    // them are real.
    expect(canonicalUrl('g', cfg(), '/catalog?category=abc'))
      .toBe('https://g.xeboki.store/catalog?category=abc');
  });

  it('always drops a fragment', () => {
    expect(canonicalUrl('g', cfg(), '/p/returns#refunds'))
      .toBe('https://g.xeboki.store/p/returns');
  });
});

describe('every indexable page says which address it is', () => {
  const APP = join(__dirname, '..', '..', 'app', '[store]');

  /** Route files that render a page a stranger can reach. */
  function pages(dir: string, out: string[] = []): string[] {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) {
        // Not indexable: the back office's own preview surfaces, and
        // anything behind a sign-in.
        if (['band-preview', 'preview', 'account', '(auth)'].includes(name)) continue;
        pages(full, out);
      } else if (name === 'page.tsx') {
        out.push(full);
      }
    }
    return out;
  }

  const routes = pages(APP).map((f) => ({
    path: relative(APP, f),
    source: readFileSync(f, 'utf8'),
  }));

  it('finds the routes at all', () => {
    expect(routes.length).toBeGreaterThan(8);
  });

  /** Pages whose own URL is worth a search result. */
  const indexable = routes.filter((r) =>
    ['page.tsx', 'catalog/page.tsx', 'blog/page.tsx', 'blog/[slug]/page.tsx',
     'p/[slug]/page.tsx', 'product/[slug]/page.tsx']
      .includes(r.path));

  it('knows which ones they are', () => {
    expect(indexable.length).toBeGreaterThanOrEqual(5);
  });

  it.each(indexable.map((r) => r.path))('%s names its canonical', (path) => {
    const route = indexable.find((r) => r.path === path)!;
    // The root layout sets the home page's, so `page.tsx` at the top is
    // covered by `metadataBase` + `alternates` there.
    if (path === 'page.tsx') {
      const layout = readFileSync(join(APP, 'layout.tsx'), 'utf8');
      expect(layout).toContain('metadataBase');
      expect(layout).toContain('canonical');
      return;
    }
    // `alternates: { canonical: … }` — the metadata key, not the word.
    // Matching on "canonical" alone passed against a file whose only
    // mention was the `canonicalUrl` import, which is exactly the shape of
    // the bug: the helper imported and never used.
    expect(route.source, `${path} emits no \`alternates.canonical\`, so its
      query-string variants each look like a separate page`)
      .toMatch(/alternates:\s*\{[^}]*canonical/);
  });
});

/// The sitemap and the canonical tags must name the same addresses.
///
/// They were built from two different pieces of code. `shopOrigin` handles a
/// custom domain the merchant typed with a scheme and strips a trailing
/// slash; the sitemap's own version did neither, so `https://shop.example`
/// in the settings produced `https://https://shop.example` in the sitemap
/// while every canonical tag was right. A crawler handed both is told the
/// shop disagrees with itself about where it lives.
describe('the sitemap agrees with the canonicals', () => {
  const APP = join(__dirname, '..', '..', 'app', '[store]');
  const sitemap = readFileSync(join(APP, 'sitemap.ts'), 'utf8');

  it('resolves the origin with the same helper the pages use', () => {
    expect(sitemap).toContain('shopOrigin');
  });

  it('does not build the origin by hand', () => {
    // A template literal pasting a domain or a slug onto `https://` is the
    // second implementation, whatever it is called.
    const handRolled = sitemap
      .split('\n')
      .filter((l) => !l.trimStart().startsWith('//'))
      .filter((l) => /`https:\/\/\$\{/.test(l));
    expect(handRolled, `these build a shop address without \`shopOrigin\`,
      which is how the sitemap and the canonical tags came to disagree:
      ${handRolled.join(' | ')}`).toEqual([]);
  });

  it('never states that an entry has no date', () => {
    // `lastModified: undefined` is not an absent date, it is a line of code
    // asserting there is none — written while the catalog response had
    // carried `updated_at` all along.
    expect(sitemap, 'an entry declares lastModified: undefined outright')
      .not.toMatch(/lastModified:\s*undefined\s*,/);
  });

  it('dates every kind of entry it can', () => {
    // Products, posts and pages all carry an edit date. A sitemap with no
    // dates gives a crawler no reason to re-read a page that changed.
    const dated = sitemap.match(/lastModified:/g) ?? [];
    expect(dated.length, 'fewer dated entry kinds than the three that have '
      + 'an updatedAt to date them').toBeGreaterThanOrEqual(3);
  });
});
