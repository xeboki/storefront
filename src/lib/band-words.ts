import type { HomeSection } from '@xeboki/sdk';
import type { BandWords } from '@/components/home/types';

/**
 * What a band says.
 *
 * The merchant's wording when they gave any, the band's own when they did
 * not. **A blank field means "use yours", never an empty heading** — every
 * shop that predates the editor has blank fields everywhere, and reading them
 * literally would strip the words off every page on the internet at once.
 *
 * Copy now lives on the INSTANCE rather than keyed by section name, because a
 * page can hold three collection bands and they cannot all be called the same
 * thing. The old `section_copy` map still feeds the default layout, whose
 * instances carry the section's name as their id.
 */
export function bandWords(
  section: HomeSection,
  defaults: Partial<BandWords>,
): BandWords {
  const own = section.copy ?? {};
  const pick = (key: keyof BandWords) => {
    const value = (own[key] ?? '').trim();
    return value || defaults[key] || '';
  };
  return {
    eyebrow: pick('eyebrow'),
    title: pick('title'),
    lede: pick('lede'),
    linkLabel: pick('linkLabel'),
  };
}

/** A setting off a band, with a type and a fallback. */
export function setting<T>(section: HomeSection, key: string, fallback: T): T {
  const value = (section.settings ?? {})[key];
  return (value === undefined || value === null || value === '')
    ? fallback
    : (value as T);
}
