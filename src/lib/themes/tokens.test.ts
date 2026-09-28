import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * A shop's state colours come from its tokens, not from Tailwind's palette.
 *
 * There were 150 of these — `bg-emerald-50 text-emerald-700` and the like —
 * across eighteen files. Two problems, and the second is the worse one: they
 * ignore the merchant entirely, and they ignore DARK MODE. A near-white tint
 * on a near-black page is a white rectangle with pale writing in it.
 *
 * Some files had hand-written `dark:` pairs to work around exactly that, which
 * is the other thing this forbids: a `dark:` variant of a state colour now
 * overrides the token with the value it was brought in to replace.
 */
const PALETTES = [
  'emerald', 'green', 'rose', 'red', 'amber', 'yellow', 'orange',
  'blue', 'sky', 'indigo',
];

const PROPS = 'bg|text|border|ring|divide|fill|stroke|from|to|via';
const HARDCODED = new RegExp(
  `(?:^|\\s|")(?:dark:)?(?:${PROPS})-(?:${PALETTES.join('|')})-\\d{2,3}`,
);

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return walk(path);
    return /\.tsx?$/.test(entry) ? [path] : [];
  });
}

describe('state colours are tokens', () => {
  // `src/lib/themes` holds the DEFAULT values these tokens are built from, so
  // it is the one place a raw colour belongs.
  const files = [...walk('src/components'), ...walk('src/app')];

  it('finds the files it is meant to be checking', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it.each(files)('%s uses no palette colour for state', (file) => {
    const offenders = readFileSync(file, 'utf8')
      .split('\n')
      .map((line, i) => [i + 1, line] as const)
      .filter(([, line]) => HARDCODED.test(line))
      .map(([n, line]) => `${n}: ${line.trim().slice(0, 100)}`);

    expect(offenders, offenders.join('\n')).toEqual([]);
  });
});

describe('every role is complete', () => {
  const css = readFileSync('src/app/globals.css', 'utf8');

  // A component asking for `bg-success-bg` when only `--color-success-solid`
  // exists gets a transparent background and no error anywhere.
  it.each(['success', 'warning', 'danger', 'info'])(
    '%s has all five tokens in both modes',
    (role) => {
      for (const part of ['bg', 'border', 'solid', 'on', 'fg']) {
        const decl = `--color-${role}-${part}`;
        expect(css, `${decl} is not declared`).toContain(decl);
        // Both blocks: the light one and the dark one.
        expect(css.split(decl).length - 1).toBeGreaterThanOrEqual(2);
      }
    },
  );
});
