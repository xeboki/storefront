import type { Rgb } from './color';
import { apca, atLightness, oklchToRgb, rgbToOklch } from './oklch';

/**
 * A twelve-step scale from one brand colour.
 *
 * Modelled on Radix's scale, because the useful idea there is not the colours
 * — it is that every step has a STATED JOB. Before this, a component that
 * needed a subtle brand-tinted fill or a hover state invented one with an
 * ad-hoc `mix`, so the same intent got three different answers in three files
 * and none of them survived a change of brand colour.
 *
 *    1  page background
 *    2  subtle background
 *    3  component background
 *    4  hovered component background
 *    5  pressed or selected component background
 *    6  subtle border — on things that are not interactive
 *    7  border and focus ring
 *    8  hovered border
 *    9  SOLID fill — the brand colour itself
 *   10  hovered solid fill
 *   11  low-contrast text
 *   12  high-contrast text
 *
 * Step 9 is the one the merchant picked; everything else is derived from it in
 * OKLCH, so a step is the same perceived distance whatever the hue. Steps 11
 * and 12 are pulled until they actually reach their APCA targets against step
 * 2, rather than being asserted — the same guarantee Radix states, checked
 * instead of hoped for.
 */
export type Scale = [
  Rgb, Rgb, Rgb, Rgb, Rgb, Rgb, Rgb, Rgb, Rgb, Rgb, Rgb, Rgb,
];

/** What each step is for, so a component can ask by name. */
export const STEP = {
  appBg: 0,
  subtleBg: 1,
  componentBg: 2,
  componentBgHover: 3,
  componentBgActive: 4,
  borderSubtle: 5,
  border: 6,
  borderHover: 7,
  solid: 8,
  solidHover: 9,
  textLow: 10,
  textHigh: 11,
} as const;

/** Where each step sits on the lightness axis, light mode and dark mode. */
const LIGHT = [0.993, 0.978, 0.955, 0.93, 0.9, 0.86, 0.81, 0.74, null, null, 0.55, 0.36];
const DARK = [0.178, 0.205, 0.245, 0.285, 0.325, 0.375, 0.44, 0.52, null, null, 0.72, 0.92];

/** Lc a step must reach against step 2 of its own scale, as Radix states. */
const TEXT_TARGET = { low: 60, high: 90 };

/**
 * Pull [start] toward [towards] until it reaches [target] Lc against [on].
 *
 * Stated targets are worth nothing unless something checks them. A brand
 * colour near the middle of the lightness range cannot reach Lc 90 at the
 * lightness the table suggests, and asserting it anyway is how "guaranteed
 * contrast" becomes a comment rather than a fact.
 */
function untilReadable(base: ReturnType<typeof rgbToOklch>, start: number,
                       towards: number, on: Rgb, target: number): Rgb {
  let best = oklchToRgb(atLightness(base, start));
  if (apca(best, on) >= target) return best;
  const steps = 24;
  for (let i = 1; i <= steps; i++) {
    const l = start + ((towards - start) * i) / steps;
    const candidate = oklchToRgb(atLightness(base, l));
    best = candidate;
    if (apca(candidate, on) >= target) return candidate;
  }
  // Nothing on this hue reaches it. The end of the range is the best there is,
  // and returning it is honest — the alternative is a colour nobody can read.
  return best;
}

export function buildScale(brand: Rgb, dark = false): Scale {
  const base = rgbToOklch(brand);
  const table = dark ? DARK : LIGHT;

  const steps = table.map((l, i) => {
    if (l !== null) return oklchToRgb(atLightness(base, l));
    // 9 is the brand itself; 10 is one notch further from the page.
    if (i === STEP.solid) return brand;
    const shifted = base.l > 0.5 ? base.l - 0.06 : base.l + 0.06;
    return oklchToRgb({ ...base, l: shifted });
  }) as Rgb[];

  const on = steps[STEP.subtleBg];
  steps[STEP.textLow] = untilReadable(base, table[STEP.textLow]!, dark ? 1 : 0, on, TEXT_TARGET.low);
  steps[STEP.textHigh] = untilReadable(base, table[STEP.textHigh]!, dark ? 1 : 0, on, TEXT_TARGET.high);

  return steps as Scale;
}

/**
 * Black or white, whichever actually reads on [fill].
 *
 * APCA rather than a luminance threshold: a mid-tone brand is exactly where a
 * threshold guesses wrong, and it is also the commonest kind of brand colour.
 */
export function onSolid(fill: Rgb): Rgb {
  const white: Rgb = [255, 255, 255];
  const ink: Rgb = [17, 24, 39];
  return apca(white, fill) >= apca(ink, fill) ? white : ink;
}
