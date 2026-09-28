import type { StorefrontConfig } from '@xeboki/sdk';

/**
 * How a shop's type is set.
 *
 * Two font pickers was the whole module, so the only thing a merchant could
 * change about their type was which faces it used — not how big the headings
 * were against the body, how tightly they were set, or whether the shop
 * SHOUTED ITS LABELS, which it did everywhere with no way to stop it.
 *
 * Every setting here is a RELATIONSHIP — a ratio, a weight, a tracking — never
 * a pixel box. The premium themes take the other road: a font picker per
 * element and sizes from 10px to 100px, which produces shops where nothing is
 * related to anything else. A scale that can be re-based but not broken is
 * worth more than thirty controls.
 */

/**
 * The ratio between steps, as a multiplier on the display sizes.
 *
 * Not a font size: the headings are already fluid `clamp()`s, and this scales
 * the whole curve so the relationship between a hero and an H2 survives.
 */
const TYPE_SCALE: Record<string, string> = {
  compact: '0.88',
  balanced: '1',
  dramatic: '1.18',
};

/**
 * The base the scale is built from, as a multiplier on the ROOT size.
 *
 * A multiplier rather than a pixel value, so a shopper who has set a larger
 * default in their browser still gets it. A shop that hardcodes 14px takes
 * that away from them.
 */
const BODY_SIZE: Record<string, string> = {
  small: '0.9375',
  normal: '1',
  large: '1.0625',
};

const HEADING_WEIGHT: Record<string, string> = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};

const HEADING_TRACKING: Record<string, string> = {
  tight: '-0.022em',
  normal: '0',
  loose: '0.015em',
};

const LABEL_CASE: Record<string, string> = {
  upper: 'uppercase',
  normal: 'none',
};

/** Tracking only makes sense on uppercase labels; without it they crowd. */
const LABEL_TRACKING: Record<string, string> = {
  upper: '0.16em',
  normal: '0.01em',
};

const TABLES = {
  'type-scale': TYPE_SCALE,
  'body-size': BODY_SIZE,
  'heading-weight': HEADING_WEIGHT,
  'heading-tracking': HEADING_TRACKING,
  'label-case': LABEL_CASE,
} as const;

/** What the storefront can draw. A test compares this to what is served. */
export const IMPLEMENTED_TYPOGRAPHY: Record<string, string[]> = Object.fromEntries(
  Object.entries(TABLES).map(([axis, table]) => [axis.replace(/-/g, '_'), Object.keys(table)]),
);

export function typographyVars(config: StorefrontConfig | null): Record<string, string> {
  const t = config?.typography ?? {};
  const pick = (axis: keyof typeof TABLES, key: string, fallback: string) => {
    const table = TABLES[axis] as Record<string, string>;
    return table[t[key] ?? ''] ?? table[fallback];
  };

  const labelCase = t['label_case'] && LABEL_CASE[t['label_case']] ? t['label_case'] : 'upper';

  return {
    '--type-scale': pick('type-scale', 'type_scale', 'balanced'),
    '--body-size': pick('body-size', 'body_size', 'normal'),
    '--heading-weight': pick('heading-weight', 'heading_weight', 'semibold'),
    // The preset still sets a tracking; a merchant's choice replaces it,
    // because pairing a wide grotesk with a tight serif means one of them
    // looks wrong and only they can say which.
    '--heading-tracking': pick('heading-tracking', 'heading_tracking', 'normal'),
    '--label-case': LABEL_CASE[labelCase],
    '--label-tracking': LABEL_TRACKING[labelCase],
  };
}
