/**
 * Colour maths for the theme system.
 *
 * Every token is stored as an "R G B" triplet (no rgb() wrapper) so Tailwind's
 * opacity modifier works: bg-primary/50 → rgb(var(--color-primary) / 0.5).
 */

export type Rgb = [number, number, number];

const HEX3 = /^#?([0-9a-f])([0-9a-f])([0-9a-f])$/i;
const HEX6 = /^#?([0-9a-f]{6})$/i;

/**
 * Parses #rgb / #rrggbb. Returns null for anything else — a merchant can save a
 * blank or half-typed colour, and a NaN triplet paints the whole shop black.
 */
export function parseHex(hex: string | null | undefined): Rgb | null {
  if (!hex) return null;
  const short = HEX3.exec(hex.trim());
  if (short) {
    return [
      parseInt(short[1] + short[1], 16),
      parseInt(short[2] + short[2], 16),
      parseInt(short[3] + short[3], 16),
    ];
  }
  const long = HEX6.exec(hex.trim());
  if (!long) return null;
  const n = parseInt(long[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function triplet(rgb: Rgb): string {
  return `${Math.round(rgb[0])} ${Math.round(rgb[1])} ${Math.round(rgb[2])}`;
}

/** Relative luminance, WCAG 2.1 §1.4.3. */
export function luminance([r, g, b]: Rgb): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG contrast ratio between two colours, 1..21. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const WHITE: Rgb = [255, 255, 255];

/**
 * Black or white text on this background, whichever a reader can actually see.
 *
 * The old rule was `luminance > 0.5 ? dark : light` on the *unlinearised*
 * average, which put white text on mid-yellow and on every pastel a merchant
 * picked. Compare both candidates and take the higher ratio.
 */
export function readableOn(bg: Rgb, dark: Rgb = [15, 23, 42]): Rgb {
  return contrastRatio(bg, WHITE) >= contrastRatio(bg, dark) ? WHITE : dark;
}

export function mix(a: Rgb, b: Rgb, t: number): Rgb {
  const k = Math.max(0, Math.min(1, t));
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}

/**
 * Lifts an accent until it reads against a dark page.
 *
 * A merchant's brand colour is chosen against white. Painted on a near-black
 * surface, a deep navy or maroon becomes invisible — so in dark mode we mix it
 * toward white until it clears `min` contrast, and stop if it never will.
 */
export function liftForDark(accent: Rgb, surface: Rgb, min = 4.5): Rgb {
  let out = accent;
  for (let step = 0; step <= 10; step++) {
    out = mix(accent, WHITE, step * 0.08);
    if (contrastRatio(out, surface) >= min) return out;
  }
  return out;
}
