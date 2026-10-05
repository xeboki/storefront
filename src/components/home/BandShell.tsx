import type { HomeSection } from '@xeboki/sdk';
import { parseHex, readableOn, triplet, mix } from '@/lib/themes/color';

/**
 * What a band sits on, and what separates it from the one above.
 *
 * A page of bands divided only by a hairline reads as one long column, and
 * the only lever a merchant had was the gap between them — which cannot do
 * the job. Spacing says "a pause"; a change of ground says "a different
 * thing". So every band now carries two choices that belong to its PLACE on
 * the page rather than to its kind, and this is the one place that draws
 * them.
 *
 * It had to be one place. Nine bands were each drawing their own `border-t
 * border-line`, which is why the line could not be turned off: there was no
 * single thing to turn off. They no longer draw it; this does.
 *
 * **The defaults are today's page.** `surface: 'page'` paints nothing and
 * `divider: 'line'` is the hairline every band already had, so a shop that
 * has never opened the editor looks exactly as it did.
 *
 * One honest limit: a few variants paint their own full-width colour because
 * that colour IS the variant — a newsletter *bar*, a reversed call to
 * action. On those, the variant's colour covers this one. The common case —
 * a hero, a grid, a carousel, an essay — has no ground of its own and takes
 * the setting fully.
 */

/** Named grounds, not colours a merchant types. The palette is already theirs. */
const SURFACES: Record<string, string> = {
  page: '',
  tinted: 'bg-surface-alt',
  panel: 'bg-surface',
  contrast: 'bg-primary-solid',
};

/**
 * A reversed band redefines the text TOKENS rather than setting a colour.
 *
 * `text-primary-foreground` on the wrapper does not work: every band writes
 * `text-fg` on its own heading, and a class on the element beats an
 * inherited colour. The first version of this painted the espresso band and
 * left its headline espresso-on-espresso — present, and unreadable.
 *
 * Redefining `--color-fg` and friends for the subtree means `text-fg` keeps
 * meaning "the readable colour here", so every band comes right without one
 * of them being touched — including bands written after this.
 *
 * The ground stays the merchant's `primary-solid`, paired with its own
 * `primary-fg`, which `solidFill` already guarantees is readable on it —
 * 4.57:1 at its worst, measured. A version of this used the page's
 * foreground instead, which reached 19:1 and turned a fragrance shop's
 * espresso band into a generic navy: the band is the brand statement, and
 * trading the brand colour for contrast it did not need is not a fix.
 */
const CONTRAST_TOKENS = {
  '--color-fg': 'var(--color-primary-fg)',
  '--color-fg-muted': 'var(--color-primary-fg)',
  '--color-fg-subtle': 'var(--color-primary-fg)',
  '--color-border': 'var(--color-primary-fg)',
} as React.CSSProperties;

/**
 * How much air the band gets, as a SCALE rather than a size.
 *
 * A fixed padding per choice would flatten the page: a trust strip and an
 * editorial section are deliberately different densities, and "roomy" must
 * not turn the strip into a section. Multiplying what the band already asks
 * for keeps that difference and still does what the merchant meant.
 *
 * Same shape as `--type-scale`, which the display sizes already use.
 */
/**
 * How the words in a band are set.
 *
 * Built from the shop's own two faces and its type scale rather than from
 * sizes typed here, so a band set differently still reads as the same shop.
 * `normal` adds nothing, which is every band that existed before this.
 *
 * The classes land on the band's wrapper and are inherited, so a band
 * written later is covered without being told.
 */
const TEXT_STYLES: Record<string, string> = {
  normal: '',
  display: 'band-type-display',
  compact: 'band-type-compact',
  caps: 'band-type-caps',
};

/**
 * Where the heading and the words under it sit.
 *
 * `start`, not `left`: in Arabic the start of a line is on the right, and a
 * band that hard-coded left would be the one thing on the page facing the
 * wrong way.
 */
const ALIGNMENTS: Record<string, string> = {
  start: '',
  center: 'band-align-center',
};

const SPACINGS: Record<string, string> = {
  normal: '1',
  tight: '0.6',
  roomy: '1.5',
};

const DIVIDERS: Record<string, string> = {
  line: 'border-t border-line',
  none: '',
};

function pick(map: Record<string, string>, value: unknown, fallback: string) {
  const key = typeof value === 'string' ? value : '';
  // An unknown name falls back rather than painting nothing: a storefront
  // older than the API it is talking to should keep drawing the page.
  return key in map ? map[key] : map[fallback];
}

export function BandShell({ section, first = false, children }: {
  section: HomeSection;
  /**
   * The first band on the page. A separator separates two things, and
   * there is nothing above the first one but the header — which draws its
   * own edge. Drawing one here puts two hairlines in a row.
   */
  first?: boolean;
  children: React.ReactNode;
}) {
  const settings = (section.settings ?? {}) as Record<string, unknown>;
  const divider = first ? '' : pick(DIVIDERS, settings.divider, 'line');
  const spacing = pick(SPACINGS, settings.spacing, 'normal');
  const textStyle = pick(TEXT_STYLES, settings.textStyle, 'normal');
  const alignment = pick(ALIGNMENTS, settings.align, 'start');

  /**
   * A colour the merchant picked, with text worked out to sit on it.
   *
   * The named grounds stay the first answer, because they come from the
   * palette the shop already has and a page built from them holds together.
   * This is the escape hatch for the band that has to be a particular
   * colour — and it is guarded: the foreground is DERIVED from the colour
   * rather than left as the page's ink, so picking a dark green cannot
   * produce near-black type on it.
   *
   * The same reason the reversed band redefines tokens instead of setting a
   * colour: every band writes `text-fg` on its own heading, and a class on
   * an element beats a colour inherited from an ancestor.
   */
  const custom = parseHex(
    typeof settings.surfaceColor === 'string' ? settings.surfaceColor : '');
  const customTokens = custom
    ? ({
        '--color-bg': triplet(custom),
        '--color-surface': triplet(custom),
        '--color-surface-alt': triplet(mix(custom, readableOn(custom), 0.08)),
        '--color-fg': triplet(readableOn(custom)),
        '--color-fg-muted': triplet(mix(readableOn(custom), custom, 0.25)),
        '--color-fg-subtle': triplet(mix(readableOn(custom), custom, 0.45)),
        '--color-border': triplet(mix(readableOn(custom), custom, 0.75)),
        backgroundColor: 'rgb(var(--color-bg))',
      } as React.CSSProperties)
    : undefined;

  // A picked colour wins the ground; the named one is what it replaces.
  const surface = custom ? '' : pick(SURFACES, settings.surface, 'page');

  const className = [surface, divider, textStyle, alignment]
    .filter(Boolean).join(' ');
  const reversed = !custom && settings.surface === 'contrast';
  const scaled = spacing !== SPACINGS.normal;

  if (!className && !reversed && !scaled && !custom) return <>{children}</>;

  // Inherited by whatever draws the padding inside, which is `.band-rhythm`
  // on the band's own container. Set here because this is the only place
  // that knows the section; read there because that is where the padding
  // lives and a band may bring its own density.
  const style = {
    ...(scaled ? ({ '--band-space': spacing } as React.CSSProperties) : null),
    ...customTokens,
  } as React.CSSProperties;

  return (
    <div className={className} style={style}>
      {reversed ? <div style={CONTRAST_TOKENS}>{children}</div> : children}
    </div>
  );
}
