/**
 * sRGB ↔ OKLCH, and the contrast measure that goes with it.
 *
 * Everything here exists because sRGB is not perceptual. Mixing a colour
 * toward black in sRGB darkens yellow far faster than blue, so a ramp built
 * that way is even in arithmetic and uneven to the eye — which is why the old
 * `solidFill` had to darken in a capped loop, testing contrast after each step
 * and giving up after four. In OKLCH, lightness IS the perceived lightness, so
 * a step is a step whatever the hue and the ramp can be stated rather than
 * searched for.
 *
 * OKLCH is also what the W3C design-token format admits (2025.10) alongside
 * srgb, hsl, hwb, lab, lch and oklab, so tokens written this way travel.
 *
 * Kept dependency-free on purpose: this runs in a server render on every page
 * of every shop, and it is about sixty lines of arithmetic.
 */

import type { Rgb } from './color';

/** Lightness 0..1, chroma 0..~0.4, hue 0..360. */
export type Oklch = { l: number; c: number; h: number };

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** sRGB transfer function, in both directions. */
const toLinear = (v: number) =>
  v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
const fromLinear = (v: number) =>
  v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;

export function rgbToOklch([r, g, b]: Rgb): Oklch {
  const lr = toLinear(r / 255);
  const lg = toLinear(g / 255);
  const lb = toLinear(b / 255);

  const l_ = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m_ = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s_ = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  const c = Math.sqrt(a * a + bb * bb);
  // Hue is meaningless at zero chroma, and a grey that reports a random hue
  // makes every derived colour jump when a merchant nudges it.
  const h = c < 1e-6 ? 0 : ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360;
  return { l: L, c, h };
}

export function oklchToRgb({ l, c, h }: Oklch): Rgb {
  const hr = (h * Math.PI) / 180;
  const a = c * Math.cos(hr);
  const b = c * Math.sin(hr);

  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;

  const l3 = l_ * l_ * l_;
  const m3 = m_ * m_ * m_;
  const s3 = s_ * s_ * s_;

  const lr = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const lg = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const lb = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3;

  return [
    Math.round(clamp01(fromLinear(lr)) * 255),
    Math.round(clamp01(fromLinear(lg)) * 255),
    Math.round(clamp01(fromLinear(lb)) * 255),
  ];
}

/**
 * The same colour at a different lightness.
 *
 * Chroma is pulled in as lightness approaches either end, because a fully
 * saturated near-white or near-black is not representable in sRGB and clamping
 * it shifts the hue — a "lighter blue" that comes back violet.
 */
export function atLightness(base: Oklch, l: number): Oklch {
  const headroom = 1 - Math.abs(l - 0.5) * 2; // 1 in the middle, 0 at the ends
  return { l: clamp01(l), c: base.c * Math.max(headroom, 0.12), h: base.h };
}

/**
 * APCA lightness contrast, as Radix guarantees its text steps against.
 *
 * WCAG 2's ratio is symmetric — it cannot tell dark-on-light from
 * light-on-dark — which is why it passes grey text that is genuinely hard to
 * read and fails white-on-brand that is genuinely fine. APCA is the WCAG 3
 * draft and is polarity-aware: the sign of the result says which way round the
 * pair is.
 *
 * Returned as an absolute Lc, 0..~106. Rules of thumb: 90 for body text, 75
 * for headlines, 60 for large or secondary text, 45 for anything a reader only
 * has to notice rather than read.
 *
 * This is a measure, not a replacement: WCAG 2 is what accessibility law names,
 * so both are kept and `contrastRatio` still exists.
 */
export function apca(text: Rgb, background: Rgb): number {
  const y = ([r, g, b]: Rgb) =>
    0.2126729 * Math.pow(r / 255, 2.4) +
    0.7151522 * Math.pow(g / 255, 2.4) +
    0.072175 * Math.pow(b / 255, 2.4);

  // Very dark values are lifted, because the eye stops distinguishing them
  // long before the arithmetic does.
  const soft = (v: number) => (v > 0.022 ? v : v + Math.pow(0.022 - v, 1.414));

  const ytxt = soft(y(text));
  const ybg = soft(y(background));
  if (Math.abs(ybg - ytxt) < 0.0005) return 0;

  let c: number;
  if (ybg > ytxt) {
    c = (Math.pow(ybg, 0.56) - Math.pow(ytxt, 0.57)) * 1.14;
    c = c < 0.1 ? 0 : c - 0.027;
  } else {
    c = (Math.pow(ybg, 0.65) - Math.pow(ytxt, 0.62)) * 1.14;
    c = c > -0.1 ? 0 : c + 0.027;
  }
  return Math.abs(c * 100);
}
