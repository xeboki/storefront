import { describe, expect, it } from 'vitest';
import { THEME_PRESETS, type Palette, type Rgb } from './presets';
import { paletteFromBackground } from '../theme';

/**
 * Every preset's text is legible on every ground that preset paints.
 *
 * `scale.test.ts` holds the twelve-step scale to APCA, but the palettes a
 * merchant actually picks from — `THEME_PRESETS` — had no contrast
 * assertion at all. That is how `fgSubtle` came to sit at **4.12:1 on the
 * page and 3.08:1 on a tinted band** in every dark preset: below the 4.5
 * floor for normal text, on the colour whose own doc comment calls it "the
 * dimmest LEGIBLE text".
 *
 * Found by measuring a live shop in dark mode, not by reading the file. The
 * dark palette takes `fgSubtle` from ramp step 500 against a step-950
 * background, which is simply too close together; the light palette takes
 * step 400 against white, which is the same mistake in the other direction.
 *
 * WCAG AA, 4.5:1, normal text. Not AAA, and not large-text 3:1 — these
 * roles are body copy, captions and helper lines.
 */

const AA = 4.5;

function luminance([r, g, b]: Rgb): number {
  const f = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrast(a: Rgb, b: Rgb): number {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/** Every ground a band or a card can sit on. */
const GROUNDS: (keyof Palette)[] = ['bg', 'surface', 'surfaceAlt'];
/** Every role that carries words a shopper has to read. */
const TEXT: (keyof Palette)[] = ['fg', 'fgMuted', 'fgSubtle'];

describe('every preset keeps its text legible', () => {
  for (const preset of THEME_PRESETS) {
    for (const mode of ['light', 'dark'] as const) {
      const palette = preset[mode];
      for (const ground of GROUNDS) {
        for (const role of TEXT) {
          it(`${preset.id} ${mode}: ${role} on ${ground}`, () => {
            const ratio = contrast(palette[role] as Rgb, palette[ground] as Rgb);
            expect(
              Number(ratio.toFixed(2)),
              `${preset.id} ${mode} draws ${role} on ${ground} at ` +
                `${ratio.toFixed(2)}:1 — a shopper cannot read it`,
            ).toBeGreaterThanOrEqual(AA);
          });
        }
      }
    }
  }
});

/**
 * …and a merchant's own background takes a different path entirely.
 *
 * `paletteFromBackground` derives a palette from whatever colour the shop
 * picked, rather than using the preset's. Fixing the presets above did not
 * touch it, and it had the same fault in a worse form: `fgSubtle` was a
 * flat 55% blend toward the page with no floor at all, which measured
 * **2.87:1** on a real shop's bone background.
 *
 * Swept across the spread a merchant actually picks from — white, warm
 * paper, near-black, and a saturated brand colour — because the blend
 * behaves differently at each end.
 */
describe('a merchant-chosen background stays legible', () => {
  const CHOSEN: [string, Rgb][] = [
    ['white', [255, 255, 255]],
    ['bone', [245, 241, 234]],
    ['warm grey', [225, 222, 215]],
    ['near-black', [12, 10, 9]],
    ['deep navy', [17, 24, 39]],
    ['saturated teal', [13, 148, 136]],
  ];

  for (const [label, chosen] of CHOSEN) {
    for (const ground of GROUNDS) {
      for (const role of TEXT) {
        it(`${label}: ${role} on ${ground}`, () => {
          const palette = paletteFromBackground(chosen, THEME_PRESETS[0].light);
          const ratio = contrast(palette[role] as Rgb, palette[ground] as Rgb);
          expect(
            Number(ratio.toFixed(2)),
            `a shop on ${label} draws ${role} on ${ground} at ` +
              `${ratio.toFixed(2)}:1`,
          ).toBeGreaterThanOrEqual(AA);
        });
      }
    }
  }
});
