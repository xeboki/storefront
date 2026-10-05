import { describe, expect, it } from 'vitest';
import { contrastRatio, mix, parseHex, readableOn } from './color';

/**
 * A colour a merchant picks always gets text they can read on it.
 *
 * Named grounds are the first answer precisely because they come from the
 * palette the shop already has. The custom colour is the escape hatch, and an
 * escape hatch that lets somebody put near-black type on a dark green is not
 * flexibility, it is a trap — the band would look fine in the editor's
 * preview and be unreadable to a shopper on a phone in daylight.
 *
 * So `BandShell` derives the whole text ramp from the picked colour. This
 * asserts the floor that derivation has to clear, across the colours people
 * actually pick: brand colours, near-blacks, near-whites, and the muddy
 * middle where a wrong guess is worst.
 */
const PICKS = [
  '#000000', '#ffffff', '#1b1b1b', '#2b2522', '#a3804f', '#0f5132',
  '#7f1d1d', '#1e3a8a', '#64748b', '#808080', '#f5f5dc', '#ffd700',
  '#4b0082', '#00ced1', '#ff69b4', '#556b2f',
];

describe('a band painted a colour of the merchant choosing', () => {
  it.each(PICKS)('puts readable body text on %s', (hex) => {
    const bg = parseHex(hex)!;
    const fg = readableOn(bg);
    // 4.5:1 is the floor for body text at a normal weight.
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(PICKS)('keeps the muted tone legible on %s', (hex) => {
    const bg = parseHex(hex)!;
    // The shell mixes the readable ink back toward the ground for muted
    // text. Mixed too far it becomes decoration; this is the point where it
    // still has to carry a sentence.
    const muted = mix(readableOn(bg), bg, 0.25);
    expect(contrastRatio(muted, bg)).toBeGreaterThanOrEqual(3);
  });

  it('refuses nonsense rather than painting it', () => {
    // A half-typed colour arrives on every keystroke while a merchant types
    // one. It has to leave the band alone, not paint it black.
    for (const bad of ['', '#', '#12', 'rebeccapurple', 'nonsense', '#12345']) {
      expect(parseHex(bad)).toBeNull();
    }
  });
});
