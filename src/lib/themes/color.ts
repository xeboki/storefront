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

/** WCAG AA for normal text. A button label is normal text. */
const AA = 4.5;

/**
 * The brand colour as a colour you can put white words on.
 *
 * `readableOn` answers "which of black or white reads better here", and for a
 * mid-tone brand — emerald, teal, most blues — the honest answer is black:
 * white clears only about 3:1, black nearly 6. So a filled button got dark
 * slate on emerald, which passes and looks like unstyled text on a coloured
 * rectangle. Nobody's brand button looks like that.
 *
 * The fix is not to put white on it anyway. It is to darken the fill until
 * white genuinely reads, which keeps the shape a person expects AND the
 * contrast they need. The merchant's colour is untouched everywhere it is
 * shown AS a colour — tints, borders, links — and shaded only where words sit
 * on top of it.
 *
 * A brand too light to carry white at all — a yellow, a pale pink — would have
 * to be darkened past recognition, so that one keeps dark text on the colour
 * as chosen. Legibility wins either way; only the route differs.
 */
export function solidFill(brand: Rgb): { fill: Rgb; text: Rgb } {
  if (contrastRatio(brand, WHITE) >= AA) return { fill: brand, text: WHITE };

  // Capped at a quarter. Beyond that it stops being a shade of the merchant's
  // colour and starts being a different one — a gold darkened until white
  // reads on it is a brown, and a shop that chose gold did not choose brown.
  for (let step = 1; step <= 4; step++) {
    const darker = mix(brand, [0, 0, 0], step * 0.06);
    if (contrastRatio(darker, WHITE) >= AA) return { fill: darker, text: WHITE };
  }
  // Too light to carry white and still be itself. Dark words on the colour as
  // chosen: less conventional, but it is their colour and it is legible.
  return { fill: brand, text: readableOn(brand) };
}

/**
 * Moves an accent until it reads against whatever page it sits on.
 *
 * `liftForDark` only ever mixes toward white, which is right for dark mode and
 * wrong for a merchant who picked a pale background: a pale accent on cream
 * would be lifted paler still. This picks the direction from the surface.
 */
export function ensureContrast(accent: Rgb, surface: Rgb, min = 3): Rgb {
  // Which way to move is decided by MEASURING both, not by a luminance
  // threshold — the same correction `readableOn` above already carries, and
  // for the same reason. On a saturated mid teal the threshold said "this is
  // dark, go lighter", while black actually reads at 4.77 there and white at
  // 3.74: it was pushing toward the worse of the two and then giving up.
  const target: Rgb = readableOn(surface);
  // All the way to the target, not 80% of the way. The old bound stopped at
  // `10 * 0.08` and returned whatever it had reached — so on a saturated
  // teal it handed back 4.42:1 when 4.77 was available by going the last
  // step. Falling short quietly is the worst of the three outcomes: it
  // neither reads nor reports.
  const STEPS = 12;
  let out = accent;
  for (let step = 0; step <= STEPS; step++) {
    out = mix(accent, target, step / STEPS);
    if (contrastRatio(out, surface) >= min) return out;
  }
  return out;
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
