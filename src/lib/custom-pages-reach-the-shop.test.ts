/**
 * A page flag the API serves is a flag something renders.
 *
 * `showInNav` and `showInFooter` have been in the API's model, its
 * response and the SDK's mapper since the Pages module shipped. **Nothing
 * in this app read either**, and no control in the back office set them —
 * so they were a contract that reached nothing from both ends at once,
 * which is why neither side looked broken.
 *
 * Found by grepping for them and getting hits only inside the SDK.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC = join(__dirname, '..');

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(full);
  }
  return out;
}

const files = walk(SRC).map((f) => ({
  path: relative(SRC, f),
  source: readFileSync(f, 'utf8'),
}));

function readers(field: string) {
  return files.filter((f) => f.source.includes(field)).map((f) => f.path);
}

describe('the page flags reach the shop', () => {
  it('finds the files at all', () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it('something renders showInFooter', () => {
    const found = readers('showInFooter');
    expect(found, 'no file reads showInFooter, so the tick does nothing')
      .not.toEqual([]);
  });

  it('the footer is given the pages, not left to find them', () => {
    // A client component cannot load them — the shop's key stays on the
    // server. So the layout reads and the footer receives.
    const footer = files.find((f) => f.path.endsWith('StorefrontFooter.tsx'));
    expect(footer?.source).toContain('footerPages');
    const layout = files.find((f) => f.path === 'app/[store]/layout.tsx');
    expect(layout?.source).toContain('loadCustomPages');
    expect(layout?.source).toContain('footerPages=');
  });

  it('only published pages are offered', () => {
    const layout = files.find((f) => f.path === 'app/[store]/layout.tsx');
    // `loadCustomPages(key, true)` — the second argument is published-only.
    expect(layout?.source).toMatch(/loadCustomPages\([^)]*,\s*true\s*\)/);
  });

  it('a page link goes to /p/, the route that exists', () => {
    const footer = files.find((f) => f.path.endsWith('StorefrontFooter.tsx'));
    expect(footer?.source).toContain('/p/${page.slug}');
  });
});
