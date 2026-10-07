/**
 * One announcement is a line. Several are a rotation.
 *
 * A shop running a single offer should not get arrows it cannot use or a
 * timer with nowhere to go, and a shop running six must not have five of them
 * quietly dropped — which is what joining them into one truncating line, and
 * then capping the list, both did.
 *
 * Rendered to static markup rather than driven in a browser: this is about
 * what the component DECIDES from its input, and effects do not run here, so
 * what is asserted is the first thing a shopper is served. Written with
 * `createElement` rather than JSX because this project's test glob is `.ts`,
 * and widening it for one file is a bigger change than the file.
 */
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { UtilityBar } from './UtilityBar';

const render = (messages: string[]) =>
  renderToStaticMarkup(
    createElement(UtilityBar, {
      messages,
      controls: createElement('span', null, 'EUR'),
      container: 'c',
    }),
  );

describe('the strip with one announcement', () => {
  const html = render(['Free delivery']);

  it('says it', () => {
    expect(html).toContain('Free delivery');
  });

  it('offers no arrows, because there is nowhere to step', () => {
    expect(html).not.toContain('Next announcement');
    expect(html).not.toContain('Previous announcement');
  });
});

describe('the strip with several', () => {
  const lines = [
    'Free delivery',
    '12% off with AUTUMNWALK',
    '5.00 off over 40.00 with WALKFIVE',
  ];
  const html = render(lines);

  it('carries every one of them, in full', () => {
    // Not three joined into a line that truncates, and not the first two
    // with the third dropped: all of them, each with its own wording.
    for (const line of lines) expect(html).toContain(line);
  });

  it('offers arrows, so nobody has to wait for the one they saw', () => {
    expect(html).toContain('Next announcement');
    expect(html).toContain('Previous announcement');
  });

  it('shows exactly one at a time', () => {
    const shown = html.match(/_shown/g) ?? [];
    expect(shown).toHaveLength(1);
  });
});

describe('the strip with nothing to say', () => {
  it('is not a band of empty page', () => {
    expect(render([])).toBe('');
  });
});
