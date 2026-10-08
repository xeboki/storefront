/**
 * The purge covers every cache the loaders fill.
 *
 * It listed three of the five tags in use: `blog` and `pages` were never
 * purged, so publishing a post or a page did nothing until the ten-minute
 * TTL expired — and the back office's "Publish now" reported success.
 *
 * Derived from the loaders rather than restated, because a hand-written list
 * beside the thing it is meant to cover is exactly the drift it should stop.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const loaders = readFileSync(join(root, 'src/lib/sdk/store.ts'), 'utf8');
const route = readFileSync(
  join(root, 'src/app/api/revalidate/route.ts'), 'utf8');

function tagsIn(source: string): string[] {
  return Array.from(new Set(
    [...source.matchAll(/tags:\s*\[([^\]]*)\]/g)]
      .flatMap((m) => [...m[1].matchAll(/'([^']+)'/g)].map((t) => t[1])),
  )).sort();
}

function purged(): string[] {
  const block = route.match(/const TAGS = \[([^\]]*)\]/);
  if (!block) throw new Error('TAGS is no longer a plain array');
  return Array.from(new Set(
    [...block[1].matchAll(/'([^']+)'/g)].map((m) => m[1]),
  )).sort();
}

describe('the cache purge', () => {
  it('covers every tag a loader fills', () => {
    const missing = tagsIn(loaders).filter((t) => !purged().includes(t));
    expect(missing).toEqual([]);
  });

  it('purges nothing that no loader fills', () => {
    const extra = purged().filter((t) => !tagsIn(loaders).includes(t));
    expect(extra).toEqual([]);
  });

  it('is reading real tags, not an empty match', () => {
    // A derived test that derives nothing passes for the wrong reason.
    expect(tagsIn(loaders).length).toBeGreaterThan(3);
    expect(purged().length).toBeGreaterThan(3);
  });
});
