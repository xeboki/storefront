/**
 * The shop's live API key must not cross into a client component.
 *
 * It did, on every page, for the life of the storefront. Two props carried
 * it — `StoreProviders.apiKey`, declared and never destructured, and
 * `SectionContext.apiKey`, "for a band that genuinely has to fetch its own",
 * which no band ever read. Both are serialised: React sends a client
 * component's props to the browser as part of the page.
 *
 * Found by reading the served HTML of a blog post and grepping it for
 * `xbk_`. A full 52-character `xbk_live_…` key sat in the flight payload of
 * `/gamebench/blog/...`, of `/`, of `/checkout` — of everything. Anyone who
 * opened view-source could call the API as the shop, and at the time every
 * blog write endpoint was authenticated by nothing else.
 *
 * So this is a source rule, not a runtime one: a `'use client'` module may
 * not name `apiKey` at all, and no server component may pass `apiKey={…}`
 * to one. A grep is the right shape here because the failure is invisible
 * at runtime — the page renders perfectly either way.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(__dirname, '..');

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(full);
  }
  return out;
}

/** Source with its comments removed.
 *
 * The first version of this test failed against `StoreProviders.tsx` — for
 * the comment that explains why the key is *not* there. Writing a finding
 * down must not look like the finding. Same lesson the API's dead-settings
 * sweep learned when a docstring satisfied a grep. */
function code(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/** The bodies of every `interface X {…}` and `type X = {…}` in a module.
 *
 * Looking for `apiKey:` anywhere in the file instead matched
 * `apiKey: cfg.apiKey` — an object literal being *built*, not a prop being
 * *declared*. What is published is what a component's type says it takes. */
function shapes(source: string): string[] {
  const found: string[] = [];
  const opener = /\b(?:interface\s+\w+|type\s+\w+\s*=)\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = opener.exec(source))) {
    let depth = 1;
    let i = m.index + m[0].length;
    const from = i;
    while (i < source.length && depth > 0) {
      if (source[i] === '{') depth += 1;
      else if (source[i] === '}') depth -= 1;
      i += 1;
    }
    found.push(source.slice(from, i - 1));
  }
  return found;
}

/** What each exported function pulls straight out of its first argument. */
function destructuredProps(source: string): string[] {
  return [...source.matchAll(/function\s+\w+\s*\(\s*\{([^}]*)\}/g)].map((m) => m[1]);
}

const files = walk(ROOT).map((f) => ({
  path: relative(ROOT, f),
  source: code(readFileSync(f, 'utf8')),
}));

/** A module that runs in the browser: its own directive, nothing inferred. */
const clientModules = files.filter((f) =>
  /^\s*(['"])use client\1/m.test(f.source.slice(0, 400)));

describe('the shop’s API key stays on the server', () => {
  it('finds the client modules at all', () => {
    // A corpus that silently matched nothing would pass every assertion
    // below while guarding nothing — the way an opt-in list always fails.
    expect(clientModules.length).toBeGreaterThan(10);
  });

  it('no client module RECEIVES one', () => {
    // A client module cannot ask for the key — `loadStore` reaches for
    // request headers and a server cache, neither of which exists in a
    // browser. The only way in is a prop, so that is what is checked: a
    // props field called `apiKey`, or one destructured out of props.
    //
    // A plain `cfg.apiKey` is left alone on purpose. Firebase's web key is
    // public by design, which is a different fact about a different key —
    // and exempting it by filename would be the hand-written list this
    // whole file exists to replace.
    const declared = clientModules
      .filter((f) => shapes(f.source).some((shape) => /\bapiKey\s*[?]?\s*:/.test(shape))
        || destructuredProps(f.source).some((bound) => /\bapiKey\b/.test(bound)))
      .map((f) => f.path);
    expect(declared, `these run in the browser and take apiKey as a prop: ${declared.join(', ')}`)
      .toEqual([]);
  });

  it('nothing passes apiKey to a component as a prop', () => {
    // `loadThing(resolved.apiKey)` is fine — that is a server call. What is
    // not fine is `<Thing apiKey={…} />`, which is a prop, which is sent.
    const passing = files
      .filter((f) => /\bapiKey\s*=\s*\{/.test(f.source))
      .map((f) => f.path);
    expect(passing, `these hand apiKey to a component: ${passing.join(', ')}`)
      .toEqual([]);
  });

  it('no context object handed to a band carries it', () => {
    // `SectionContext` reaches five `'use client'` bands whole, so a field
    // added to it is a field published.
    const context = files.find((f) => f.path === 'components/home/types.ts');
    expect(context).toBeDefined();
    expect(/^\s*apiKey\s*:/m.test(context!.source)).toBe(false);
  });

  it('no key literal is written into the source anywhere', () => {
    const hardcoded = files
      .filter((f) => /xbk_(live|test)_[A-Za-z0-9_-]{8,}/.test(f.source))
      .map((f) => f.path);
    expect(hardcoded, `a key literal is committed in: ${hardcoded.join(', ')}`)
      .toEqual([]);
  });
});
