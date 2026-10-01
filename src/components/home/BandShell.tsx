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
 */
const CONTRAST_TOKENS = {
  '--color-fg': 'var(--color-primary-fg)',
  '--color-fg-muted': 'var(--color-primary-fg)',
  '--color-fg-subtle': 'var(--color-primary-fg)',
  '--color-border': 'var(--color-primary-fg)',
} as React.CSSProperties;

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

  const className = [surface, divider].filter(Boolean).join(' ');
  const reversed = settings.surface === 'contrast';
  if (!className && !reversed) return <>{children}</>;
  return (
    <div className={className} style={reversed ? CONTRAST_TOKENS : undefined}>
      {children}
    </div>
  );
}
