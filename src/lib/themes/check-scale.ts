/**
 * Checks the colour scale keeps the guarantees it states.
 *
 * A plain script rather than a test file: this package has no test runner, and
 * `npm install` cannot add one here because the SDK is wired with pnpm's
 * `workspace:` protocol, which npm refuses. Fighting the package manager to
 * install a framework for sixty assertions is the wrong trade — the API's
 * pytest suite runs this and reports what it says.
 *
 *     npm run check:colour
 *
 * Exits non-zero and names what failed.
 */
import type { Rgb } from './color';
import { apca, atLightness, oklchToRgb, rgbToOklch } from './oklch';
import { STEP, buildScale, onSolid } from './scale';

/**
 * Every brand here breaks a naive implementation. Yellow is the hue sRGB
 * mixing darkens fastest and the one where white text fails; navy starts near
 * the dark end; grey has no hue to preserve; near-black and near-white have no
 * headroom at all.
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

const failures: string[] = [];
let checks = 0;

function check(what: string, ok: boolean) {
  checks++;
  if (!ok) failures.push(what);
}

for (const [name, brand] of BRANDS) {
  for (const dark of [false, true]) {
    const mode = dark ? 'dark' : 'light';
    const s = buildScale(brand, dark);
    const on = s[STEP.subtleBg];

    // The guarantee Radix states for its text steps, checked rather than
    // asserted — a brand near the middle of the range cannot reach Lc 90 at
    // the lightness a table suggests.
    check(`${name}/${mode}: low-contrast text reaches Lc 60 (got ${apca(s[STEP.textLow], on).toFixed(0)})`,
      apca(s[STEP.textLow], on) >= 60);
    check(`${name}/${mode}: high-contrast text reaches Lc 90 (got ${apca(s[STEP.textHigh], on).toFixed(0)})`,
      apca(s[STEP.textHigh], on) >= 90);

    check(`${name}/${mode}: every step is a real colour`,
      s.every((c) => c.every((v) => Number.isFinite(v) && v >= 0 && v <= 255)));

    // Steps 1-8 have to run one way, or a "subtle" fill can come out darker
    // than the border it sits inside.
    const l = (c: Rgb) => rgbToOklch(c).l;
    let ordered = true;
    for (let i = STEP.appBg; i < STEP.borderHover; i++) {
      ordered &&= dark ? l(s[i]) < l(s[i + 1]) + 0.001 : l(s[i]) > l(s[i + 1]) - 0.001;
    }
    check(`${name}/${mode}: steps 1-8 run in one direction`, ordered);

    check(`${name}/${mode}: step 9 is the colour the merchant chose`,
      s[STEP.solid].join() === brand.join());

    check(`${name}/${mode}: whatever sits on the solid fill actually reads`,
      apca(onSolid(s[STEP.solid]), s[STEP.solid]) > 45);
  }

  // Converting each way has to come back where it started, or a merchant's
  // colour drifts every time the theme is rebuilt.
  const back = oklchToRgb(rgbToOklch(brand));
  check(`${name}: survives a round trip through OKLCH`,
    back.every((v, i) => Math.abs(v - brand[i]) <= 1));
}

// The two cases a luminance threshold gets wrong, which is why APCA is here.
check('yellow takes dark text', onSolid([234, 179, 8])[0] < 128);
check('navy takes white text', onSolid([30, 41, 99])[0] > 128);

// A hue that jumps around on a neutral makes every derived colour jump when a
// merchant nudges the brand by one step.
check('a grey reports no hue rather than a random one',
  rgbToOklch([128, 128, 128]).h === 0 && rgbToOklch([128, 128, 128]).c < 0.001);

// Pushing chroma past what sRGB holds clamps a channel, and a "lighter blue"
// comes back violet.
{
  const base = rgbToOklch([37, 99, 235]);
  const lighter = rgbToOklch(oklchToRgb(atLightness(base, 0.9)));
  check('lightening does not swing the hue', Math.abs(lighter.h - base.h) < 12);
}

// WCAG 2's ratio is symmetric and cannot tell which way round a pair is.
check('APCA is polarity-aware',
  Math.abs(apca([20, 20, 20], [250, 250, 250]) - apca([250, 250, 250], [20, 20, 20])) > 1);
check('a colour on itself has no contrast', apca([80, 120, 200], [80, 120, 200]) === 0);

if (failures.length) {
  console.error(`✗ ${failures.length} of ${checks} colour checks failed:`);
  for (const f of failures) console.error(`   ${f}`);
  process.exit(1);
}
console.log(`✓ ${checks} colour checks passed across ${BRANDS.length} brands`);
