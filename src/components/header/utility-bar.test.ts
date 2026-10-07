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
import { DWELL_MS, UtilityBar } from './UtilityBar';

const render = (
  lines: Array<{ text: string; code?: string }>,
  rotate = 'normal',
) =>
  renderToStaticMarkup(
    createElement(UtilityBar, {
      lines,
      controls: createElement('span', null, 'EUR'),
      container: 'c',
      rotate,
    }),
  );

describe('the strip with one announcement', () => {
  const html = render([{ text: 'Free delivery' }]);

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
    { text: 'Free delivery' },
    { text: '12% off', code: 'AUTUMNWALK' },
    { text: '5.00 off over 40.00', code: 'WALKFIVE' },
  ];
  const html = render(lines);

  it('carries every one of them, in full', () => {
    // Not three joined into a line that truncates, and not the first two
    // with the third dropped: all of them, each with its own wording.
    for (const line of lines) {
      expect(html).toContain(line.text);
      if (line.code) expect(html).toContain(line.code);
    }
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

describe('a code is something to press, not something to select', () => {
  it('becomes a control, named with the code it would copy', () => {
    // A reader who hears "copy" alone has not been told what they would get.
    const html = render([{ text: '12% off', code: 'AUTUMNWALK' }]);
    expect(html).toContain('Copy discount code AUTUMNWALK');
    expect(html).toContain('AUTUMNWALK');
  });

  it('is absent when the offer applies itself', () => {
    // Nothing to carry away, so nothing to press.
    const html = render([{ text: 'Free delivery' }]);
    expect(html).not.toContain('Copy discount code');
    expect(html).not.toContain('<button');
  });

  it("is absent from the shop's own note", () => {
    const html = render([{ text: 'Free returns for 30 days' }]);
    expect(html).not.toContain('Copy discount code');
  });
});

/**
 * The pace is the merchant's, and the names mean what the back office says.
 *
 * Asserted on the table rather than by running the timer: the rotation is an
 * effect, these tests render to static markup, and a test that waited nine
 * real seconds to watch a crossfade would be a worse test than this one.
 */
describe('how fast it turns over', () => {
  it('is the four names the back office offers, and no others', () => {
    // `off` is absent on purpose — no entry is what makes the strip still.
    expect(Object.keys(DWELL_MS).sort()).toEqual(['fast', 'normal', 'slow']);
    expect(DWELL_MS['off']).toBeUndefined();
  });

  it('holds each line for the seconds the merchant was promised', () => {
    // These are the words in the picker: "Every 9 seconds", and so on. A
    // shop told nine and given five is the setting lying to the merchant.
    expect(DWELL_MS['slow']).toBe(9000);
    expect(DWELL_MS['normal']).toBe(5000);
    expect(DWELL_MS['fast']).toBe(3000);
  });

  it('still says its one line when the merchant stopped the rotation', () => {
    // Off is a still strip, not an absent one.
    const html = render([{ text: 'Free delivery' }, { text: '12% off' }], 'off');
    expect(html).toContain('Free delivery');
    expect(html).toContain('Next announcement');
  });

  it('draws the same first line whatever the pace', () => {
    const lines = [{ text: 'Free delivery' }, { text: '12% off' }];
    for (const pace of ['slow', 'normal', 'fast', 'off']) {
      expect((render(lines, pace).match(/_shown/g) ?? [])).toHaveLength(1);
    }
  });
});
