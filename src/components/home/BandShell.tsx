import type { HomeSection } from '@xeboki/sdk';

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
  contrast: 'band-reversed',
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
 * They go on an INNER element. The ground is `rgb(var(--color-fg))`, and a
 * custom property redefined on an element applies to that element's own
 * declarations too — so painting and flipping on the same node would make
 * the background resolve to the flipped value and cancel itself.
 */
const CONTRAST_TOKENS = {
  '--color-fg': 'var(--color-bg)',
  '--color-fg-muted': 'var(--color-bg)',
  '--color-fg-subtle': 'var(--color-bg)',
  '--color-border': 'var(--color-bg)',
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
  const surface = pick(SURFACES, settings.surface, 'page');
  const divider = first ? '' : pick(DIVIDERS, settings.divider, 'line');
  const spacing = pick(SPACINGS, settings.spacing, 'normal');

  const className = [surface, divider].filter(Boolean).join(' ');
  const reversed = settings.surface === 'contrast';
  const scaled = spacing !== SPACINGS.normal;

  if (!className && !reversed && !scaled) return <>{children}</>;

  // Inherited by whatever draws the padding inside, which is `.band-rhythm`
  // on the band's own container. Set here because this is the only place
  // that knows the section; read there because that is where the padding
  // lives and a band may bring its own density.
  const style = (scaled
    ? { '--band-space': spacing }
    : undefined) as React.CSSProperties | undefined;

  return (
    <div className={className} style={style}>
      {reversed ? <div style={CONTRAST_TOKENS}>{children}</div> : children}
    </div>
  );
}
