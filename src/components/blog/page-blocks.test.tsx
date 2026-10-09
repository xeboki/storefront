/**
 * The blocks a page is built out of, and what they do with bad input.
 *
 * These are typed by a merchant into a textarea, so a missing colon or a
 * stray blank line has to degrade — never throw. A page is not worth
 * 500ing over a malformed FAQ, and the alternative to "renders nothing" is
 * "takes the whole page down".
 */
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Callout, Buttons, Faq, Columns, Video, BLOCKS } from './PageBlocks';

const html = (node: JSX.Element | null) =>
  node === null ? '' : renderToStaticMarkup(node);

describe('a notice', () => {
  it('shows what was written', () => {
    expect(html(<Callout tone="warning">Closed on Monday.</Callout>))
      .toContain('Closed on Monday.');
  });

  it('keeps paragraphs apart', () => {
    const out = html(<Callout>{'One.\n\nTwo.'}</Callout>);
    // `</p>`, not `<p` — the notice's own icon renders `<path>` elements,
    // and counting those said four paragraphs where there were two.
    expect(out.match(/<\/p>/g)?.length).toBe(2);
  });

  it('an unknown tone is a notice, not a crash', () => {
    expect(html(<Callout tone="chartreuse">Hi</Callout>)).toContain('Hi');
  });
});

describe('buttons', () => {
  it('reads label and address either side of the pipe', () => {
    const out = html(<Buttons>{'Start a return | /account/orders'}</Buttons>);
    expect(out).toContain('Start a return');
    expect(out).toContain('href="/account/orders"');
  });

  it('takes several, one a line', () => {
    const out = html(<Buttons>{'A | /a\nB | /b'}</Buttons>);
    expect(out.match(/<a /g)?.length).toBe(2);
  });

  it('a line with no address is skipped rather than linking nowhere', () => {
    const out = html(<Buttons>{'Just some words\nB | /b'}</Buttons>);
    expect(out.match(/<a /g)?.length).toBe(1);
  });

  it('nothing usable renders nothing', () => {
    expect(html(<Buttons>{'   '}</Buttons>)).toBe('');
  });
});

describe('questions', () => {
  it('pairs each question with its answer', () => {
    const out = html(<Faq>{'Q: How long?\nA: Five days.'}</Faq>);
    expect(out).toContain('How long?');
    expect(out).toContain('Five days.');
    expect(out).toContain('<details');
  });

  it('works before any JavaScript arrives', () => {
    // `<details>` rather than React state: the browser's own find can
    // search inside it, and it carries its keyboard behaviour for free.
    expect(html(<Faq>{'Q: A\nA: B'}</Faq>)).toContain('<summary');
  });

  it('a long answer can run across two lines', () => {
    const out = html(<Faq>{'Q: A\nA: first\nsecond'}</Faq>);
    expect(out).toContain('first');
    expect(out).toContain('second');
  });

  it('an answer with no question is dropped, not shown bare', () => {
    expect(html(<Faq>{'A: orphan'}</Faq>)).toBe('');
  });

  it('is case-insensitive about the markers', () => {
    expect(html(<Faq>{'q: A\na: B'}</Faq>)).toContain('<details');
  });
});

describe('columns', () => {
  it('splits on a rule', () => {
    const out = html(<Columns>{'### Left\nOne\n---\n### Right\nTwo'}</Columns>);
    expect(out).toContain('Left');
    expect(out).toContain('Right');
    expect(out).toContain('sm:grid-cols-2');
  });

  it('stacks on a phone', () => {
    // Two 180px columns on a 390px screen is worse than one.
    const out = html(<Columns>{'A\n---\nB'}</Columns>);
    expect(out).toContain('sm:grid-cols-2');
    expect(out).not.toContain('grid-cols-2 ');
  });

  it('three parts get three columns', () => {
    expect(html(<Columns>{'A\n---\nB\n---\nC'}</Columns>))
      .toContain('sm:grid-cols-3');
  });

  it('a heading line becomes a heading', () => {
    expect(html(<Columns>{'### Title\nbody'}</Columns>)).toContain('<h3');
  });

  it('empty renders nothing', () => {
    expect(html(<Columns>{'  \n  '}</Columns>)).toBe('');
  });
});

describe('video', () => {
  it('takes the URL from the address bar, not an embed URL', () => {
    // Nobody pastes an /embed/ link. They paste what they were watching.
    const out = html(<Video>{'https://www.youtube.com/watch?v=dQw4w9WgXcQ'}</Video>);
    expect(out).toContain('youtube-nocookie.com/embed/dQw4w9WgXcQ');
  });

  it('understands a short link and a Vimeo link', () => {
    expect(html(<Video>{'https://youtu.be/abc123XYZ'}</Video>))
      .toContain('/embed/abc123XYZ');
    expect(html(<Video>{'https://vimeo.com/76979871'}</Video>))
      .toContain('player.vimeo.com/video/76979871');
  });

  it('uses the no-cookie host', () => {
    // A page about returns should not set an advertising cookie.
    expect(html(<Video>{'https://www.youtube.com/watch?v=abcdefg'}</Video>))
      .toContain('youtube-nocookie');
  });

  it('something it cannot embed becomes a link, not an empty frame', () => {
    const out = html(<Video>{'https://example.com/clip.mp4'}</Video>);
    expect(out).toContain('href="https://example.com/clip.mp4"');
    expect(out).not.toContain('<iframe');
  });

  it('empty renders nothing', () => {
    expect(html(<Video>{'   '}</Video>)).toBe('');
  });
});

describe('the block list', () => {
  /**
   * Read from the Manager editor's own source.
   *
   * A block the toolbar can insert and this file cannot render shows the
   * merchant a wall of backticks on their own shop — and nothing fails,
   * on either side, which is exactly how the two would drift.
   */
  const inserters = (() => {
    const path = join(__dirname, '..', '..', '..', '..',
                      'Manager', 'lib', 'screens', 'storefront',
                      'page_blocks.dart');
    if (!existsSync(path)) return null;
    const source = readFileSync(path, 'utf8');
    return [...source.matchAll(/^\s*id: '([a-z]+)',/gm)].map((m) => m[1]);
  })();

  it.runIf(inserters)('the cross-repo read finds the editor\'s blocks', () => {
    // A list that came back empty would make every assertion below vacuous.
    expect(inserters!.length).toBeGreaterThanOrEqual(5);
  });

  it.runIf(inserters)('every block the editor can insert is rendered here', () => {
    const missing = inserters!.filter(
      (name) => name !== 'table' && typeof BLOCKS[name] !== 'function');
    expect(missing,
      `the toolbar inserts these and nothing renders them: ${missing.join(', ')}`)
      .toEqual([]);
  });

  it('every renderer is something the editor can insert', () => {
    if (!inserters) return;
    const orphans = Object.keys(BLOCKS).filter((n) => !inserters.includes(n));
    expect(orphans,
      `nothing can write these, so they are unreachable: ${orphans.join(', ')}`)
      .toEqual([]);
  });

  it('blocks are intercepted at `pre`, not at `code`', () => {
    // Markdown wraps a fenced block in `<pre><code>`. Replacing only the
    // inner one left every block inside the code-block styling on the
    // shop: grey, monospace, horizontally scrolling, columns running into
    // each other. The editor's preview looked right, which is what made it
    // worth catching here.
    const body = readFileSync(join(__dirname, 'BlogBody.tsx'), 'utf8');
    expect(body).toMatch(/pre:\s*\(\{/);
    const codeOverride = /(?<!\w)code:\s*\(\{[^}]*\}\)\s*=>/.exec(body);
    if (codeOverride) {
      // If a `code` override exists it must not be the one doing the
      // block lookup — that is the shape of the bug.
      const after = body.slice(codeOverride.index, codeOverride.index + 400);
      expect(after).not.toContain('BLOCKS[');
    }
  });

  it('an unknown block is not in the map, so it stays plain text', () => {
    // A shop on an older storefront shows the words rather than broken
    // markup, and so does somebody who mistypes the name.
    expect(BLOCKS['accordion']).toBeUndefined();
  });
});
