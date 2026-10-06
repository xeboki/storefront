/**
 * A menu style either shows the merchant's submenus or says it does not.
 *
 * The rail is the DEFAULT, and it dropped every second-level entry without a
 * word — so a merchant who built "Shops → Shop Layouts, Shop Features…" in
 * the back office saw five flat names on their shop and nothing anywhere
 * explaining where the rest went. Authoring something the shop quietly
 * ignores is the worst version of this: it looks like data loss.
 *
 * Derived from the source rather than from a list kept here: a style passes
 * by rendering the children, or by declaring `SHOWS_SUBMENUS = false` in
 * code. The first version accepted the phrase "top level only" in a
 * docstring — and then the rail, having CHANGED its mind, quoted that phrase
 * while explaining the change and sailed through. Prose is too easy to trip
 * over; a declaration is not.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIR = join(process.cwd(), 'src/components/header/styles');
const styles = readdirSync(DIR).filter((f) => f.endsWith('.tsx'));

describe('every menu style has an answer for submenus', () => {
  it('finds the styles at all', () => {
    // A rename that empties this would make every case below vacuously true.
    expect(styles.length).toBeGreaterThanOrEqual(4);
  });

  it.each(styles)('%s renders children or says it does not', (file) => {
    const source = readFileSync(join(DIR, file), 'utf8');
    const renders = /\.children\.(?:length|map|flatMap)/.test(source);
    const declines = /export const SHOWS_SUBMENUS\s*=\s*false/.test(source);
    expect(
      renders || declines,
      `${file} neither renders the children nor declares ` +
        `SHOWS_SUBMENUS = false — a merchant's submenus would vanish from ` +
        `their shop with no explanation anywhere`,
    ).toBe(true);
  });
});
