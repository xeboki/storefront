import { describe, expect, it } from 'vitest';

import type { Rgb } from './color';
import { apca, atLightness, oklchToRgb, rgbToOklch } from './oklch';
import { STEP, buildScale, onSolid } from './scale';

/**
 * A scale that states a contrast guarantee either keeps it or is a comment.
 *
 * Every brand here breaks a naive implementation. Yellow is the hue sRGB
 * mixing darkens fastest and the one where white text fails; navy starts near
 * the dark end of the range; grey has no hue to preserve; near-black and
 * near-white have no headroom at all.
 */
const BRANDS: [string, Rgb][] = [
  ['emerald', [5, 150, 105]],
  ['yellow', [234, 179, 8]],
  ['navy', [30, 41, 99]],
  ['pink', [219, 39, 119]],
  ['cyan', [6, 182, 212]],
  ['grey', [113, 113, 122]],
  ['near-black', [12, 12, 14]],
  ['near-white', [250, 250, 252]],
];

const MODES: [string, boolean][] = [['light', false], ['dark', true]];

describe.each(BRANDS)('%s', (_name, brand) => {
  describe.each(MODES)('%s', (_mode, dark) => {
    const scale = buildScale(brand, dark);
    const subtle = scale[STEP.subtleBg];

    it('low-contrast text reaches Lc 60 on its own subtle background', () => {
      expect(apca(scale[STEP.textLow], subtle)).toBeGreaterThanOrEqual(60);
    });

    it('high-contrast text reaches Lc 90', () => {
      expect(apca(scale[STEP.textHigh], subtle)).toBeGreaterThanOrEqual(90);
    });

    it('every step is a colour that exists', () => {
      for (const step of scale) {
        for (const channel of step) {
          expect(Number.isFinite(channel)).toBe(true);
          expect(channel).toBeGreaterThanOrEqual(0);
          expect(channel).toBeLessThanOrEqual(255);
        }
      }
    });

    it('steps 1 to 8 run in one direction', () => {
      // Or a "subtle" fill comes out darker than the border around it.
      const l = (c: Rgb) => rgbToOklch(c).l;
      for (let i = STEP.appBg; i < STEP.borderHover; i++) {
        if (dark) expect(l(scale[i])).toBeLessThan(l(scale[i + 1]) + 0.001);
        else expect(l(scale[i])).toBeGreaterThan(l(scale[i + 1]) - 0.001);
      }
    });

    it('step 9 is the colour the merchant chose, untouched', () => {
      expect(scale[STEP.solid]).toEqual(brand);
    });

    it('whatever sits on the solid fill actually reads', () => {
      expect(apca(onSolid(scale[STEP.solid]), scale[STEP.solid])).toBeGreaterThan(45);
    });
  });

  it('survives a round trip through OKLCH', () => {
    // Or a merchant's colour drifts every time the theme is rebuilt.
    const back = oklchToRgb(rgbToOklch(brand));
    back.forEach((v, i) => expect(Math.abs(v - brand[i])).toBeLessThanOrEqual(1));
  });
});

describe('the cases a luminance threshold gets wrong', () => {
  it('yellow takes dark text', () => {
    expect(onSolid([234, 179, 8])[0]).toBeLessThan(128);
  });

  it('navy takes white text', () => {
    expect(onSolid([30, 41, 99])[0]).toBeGreaterThan(128);
  });
});

describe('hue behaves', () => {
  it('a grey reports no hue rather than a random one', () => {
    // A hue that jumps on a neutral makes every derived colour jump when a
    // merchant nudges the brand by one step.
    const grey = rgbToOklch([128, 128, 128]);
    expect(grey.h).toBe(0);
    expect(grey.c).toBeLessThan(0.001);
  });

  it('lightening does not swing the hue', () => {
    // Pushing chroma past what sRGB holds clamps a channel, and a "lighter
    // blue" comes back violet.
    const base = rgbToOklch([37, 99, 235]);
    const lighter = rgbToOklch(oklchToRgb(atLightness(base, 0.9)));
    expect(Math.abs(lighter.h - base.h)).toBeLessThan(12);
  });
});

describe('APCA', () => {
  it('is polarity-aware, unlike a WCAG ratio', () => {
    // WCAG 2 is symmetric and cannot tell which way round a pair is. If these
    // ever match, the formula has been replaced by a luminance ratio.
    const a = apca([20, 20, 20], [250, 250, 250]);
    const b = apca([250, 250, 250], [20, 20, 20]);
    expect(Math.abs(a - b)).toBeGreaterThan(1);
  });

  it('a colour on itself has no contrast', () => {
    expect(apca([80, 120, 200], [80, 120, 200])).toBe(0);
  });
});
