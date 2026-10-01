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
 *
 * ## Inside a column, blank means BLANK
 *
 * The rule above exists for shops that predate the editor. **No such shop has
 * a nested block** — a block in a column can only have been put there by
 * somebody using the editor or by a template, both of which write their copy.
 * So nothing is protected by inventing a heading for one, and inventing one
 * actively breaks the commonest row there is: a card that titles the carousel
 * beside it. On a fragrance shop that row read
 *
 *     NEW THIS SEASON            HANDPICKED
 *     The autumn edit            Featured services
 *
 * — two headings for one thing, the second of them the band's own default,
 * and the merchant could not clear it because clearing the field gave it back.
 *
 * `linkLabel` is exempt: it labels a control ("View all", "Book"), it is not
 * editorial, and an unlabelled link is a different kind of broken.
 */
export function bandWords(
  section: HomeSection,
  defaults: Partial<BandWords>,
  nested = false,
): BandWords {
  const own = section.copy ?? {};
  const pick = (key: keyof BandWords) => {
    const value = (own[key] ?? '').trim();
    if (value) return value;
    // In a column the band's own heading words are not offered.
    if (nested && key !== 'linkLabel') return '';
    return defaults[key] || '';
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
