import { describe, expect, it } from 'vitest';

import type { HeroSlide, StoreConfig, StorefrontConfig } from '@xeboki/sdk';
import { inStore, isLive, resolveSlides } from './hero-slides';

/**
 * The fallback banner is the path nobody exercises.
 *
 * A shop with live campaigns shows them, and that is the case everyone looks
 * at. The two that matter are the quiet ones: a shop that has never used the
 * slideshow, and a shop whose campaigns have ALL been scheduled away. Get the
 * second wrong and the home page opens on a category rail, which reads as
 * broken rather than "between campaigns".
 */

const NOW = new Date('2026-06-15T12:00:00Z');

const store = { businessName: 'Game Bench' } as unknown as StoreConfig;

function slide(over: Partial<HeroSlide> = {}): HeroSlide {
  return {
    id: 'a', imageUrl: '', eyebrow: '', title: 'Campaign', titleSize: 'large',
    subtitle: '', ctaText: '', ctaUrl: '', secondaryCtaText: '',
    secondaryCtaUrl: '', align: 'left', vertical: 'middle', alignMobile: 'left',
    overlay: 'medium', startsAt: '', endsAt: '', ...over,
  };
}

function config(over: Partial<StorefrontConfig> = {}): StorefrontConfig {
  return {
    heroTitle: 'The permanent banner',
    heroSubtitle: 'Always here',
    heroCtaText: '', heroCtaUrl: '',
    heroSecondaryCtaText: '', heroSecondaryCtaUrl: '',
    heroImageUrl: '', heroSlides: [], sections: {},
    ...over,
  } as unknown as StorefrontConfig;
}

describe('a shop that has never used the slideshow', () => {
  it('shows the banner built from its hero fields', () => {
    const got = resolveSlides(config(), store, 'gamebench', NOW);
    expect(got).toHaveLength(1);
    expect(got[0].title).toBe('The permanent banner');
  });

  it('falls back to the shop name when even that is blank', () => {
    const got = resolveSlides(config({ heroTitle: '' }), store, 'gamebench', NOW);
    expect(got[0].title).toBe('Game Bench');
  });

  it('never returns an empty list', () => {
    // An empty hero band is a home page that opens on a category rail.
    expect(resolveSlides(null, store, 'gamebench', NOW)).toHaveLength(1);
  });
});

describe('a shop with live campaigns', () => {
  it('shows them and not the permanent banner', () => {
    const got = resolveSlides(
      config({ heroSlides: [slide({ title: 'Sale' })] }), store, 'gamebench', NOW);
    expect(got.map((s) => s.title)).toEqual(['Sale']);
  });

  it('keeps the merchant’s order', () => {
    const got = resolveSlides(
      config({ heroSlides: [slide({ id: '1', title: 'One' }), slide({ id: '2', title: 'Two' })] }),
      store, 'gamebench', NOW);
    expect(got.map((s) => s.title)).toEqual(['One', 'Two']);
  });
});

describe('when every campaign is scheduled away', () => {
  it('falls back to the permanent banner rather than showing nothing', () => {
    const got = resolveSlides(
      config({
        heroSlides: [
          slide({ id: '1', title: 'Last week', endsAt: '2026-06-01T00:00:00Z' }),
          slide({ id: '2', title: 'Next week', startsAt: '2026-07-01T00:00:00Z' }),
        ],
      }),
      store, 'gamebench', NOW);
    expect(got).toHaveLength(1);
    expect(got[0].title).toBe('The permanent banner');
  });

  it('shows only the live ones when some are away', () => {
    const got = resolveSlides(
      config({
        heroSlides: [
          slide({ id: '1', title: 'Over', endsAt: '2026-06-01T00:00:00Z' }),
          slide({ id: '2', title: 'Running' }),
        ],
      }),
      store, 'gamebench', NOW);
    expect(got.map((s) => s.title)).toEqual(['Running']);
  });
});

describe('what counts as live', () => {
  it('blank dates run forever', () => {
    expect(isLive({ startsAt: '', endsAt: '' }, NOW)).toBe(true);
  });

  it('a start in the future has not begun', () => {
    expect(isLive({ startsAt: '2026-07-01T00:00:00Z', endsAt: '' }, NOW)).toBe(false);
  });

  it('an end in the past is over', () => {
    expect(isLive({ startsAt: '', endsAt: '2026-06-01T00:00:00Z' }, NOW)).toBe(false);
  });

  it('a window containing now is live', () => {
    expect(isLive(
      { startsAt: '2026-06-01T00:00:00Z', endsAt: '2026-07-01T00:00:00Z' }, NOW)).toBe(true);
  });

  it('a date nobody can parse runs rather than vanishing', () => {
    // A typo in a date field must not silently remove a merchant's banner.
    expect(isLive({ startsAt: 'next tuesday', endsAt: '' }, NOW)).toBe(true);
    expect(isLive({ startsAt: '', endsAt: 'whenever' }, NOW)).toBe(true);
  });
});

describe('the second button', () => {
  it('on the permanent banner follows the section switch', () => {
    const off = resolveSlides(
      config({ sections: { heroSecondaryCta: false } }), store, 'gamebench', NOW);
    expect(off[0].showSecondary).toBe(false);

    const on = resolveSlides(config(), store, 'gamebench', NOW);
    expect(on[0].showSecondary).toBe(true);
  });

  it('on an authored slide follows whether it has a label', () => {
    // A blank label is how a merchant says "one button on this banner".
    const got = resolveSlides(
      config({
        sections: { heroSecondaryCta: false },
        heroSlides: [
          slide({ id: '1', title: 'A', secondaryCtaText: 'Find us' }),
          slide({ id: '2', title: 'B' }),
        ],
      }),
      store, 'gamebench', NOW);
    expect(got.map((s) => s.showSecondary)).toEqual([true, false]);
  });
});

describe('links stay inside the shop', () => {
  it('a relative path is prefixed with the store', () => {
    expect(inStore('/book', 'gamebench', '/x')).toBe('/gamebench/book');
  });

  it('an absolute URL is left alone', () => {
    expect(inStore('https://example.com', 'gamebench', '/x')).toBe('https://example.com');
    expect(inStore('mailto:a@b.c', 'gamebench', '/x')).toBe('mailto:a@b.c');
  });

  it('blank falls back to what the caller asked for', () => {
    expect(inStore('   ', 'gamebench', '/gamebench/catalog')).toBe('/gamebench/catalog');
  });

  it('the Design screen’s pre-filled /products reaches the catalogue', () => {
    // That field shipped pre-filled with '/products' while nothing read it, so
    // every shop that saved the screen holds a link to a page that does not
    // exist here.
    expect(inStore('/products', 'gamebench', '/x')).toBe('/gamebench/catalog');
  });
});
