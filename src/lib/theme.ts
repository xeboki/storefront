/**
 * Turns a StorefrontConfig into the CSS custom properties the whole shop is
 * painted from.
 *
 * Two things decide how a storefront looks:
 *   1. the preset (`config.theme`) — neutrals, radius, type pairing, structure
 *   2. the merchant's own brand colours and fonts — always layered on top
 *
 * Both light and dark are emitted every time, so a shopper can switch without a
 * round trip. Dark is a `:root.dark` block, which is why these go out as a
 * stylesheet rather than an inline style attribute — an inline style cannot be
 * overridden by a class.
 *
 * Every colour is an "R G B" triplet so Tailwind's opacity modifier works:
 *   bg-primary/50  →  background: rgb(var(--color-primary) / 0.5)
 */
import type { StorefrontConfig } from '@xeboki/sdk';
import {
  ensureContrast,
  liftForDark,
  luminance,
  mix,
  parseHex,
  readableOn,
  triplet,
  type Rgb,
} from './themes/color';
import {
  resolvePreset,
  type CardStyle,
  type HeroStyle,
  type Palette,
  type ThemePreset,
} from './themes/presets';

const FALLBACK_PRIMARY: Rgb = [15, 23, 42]; // slate-900
const FALLBACK_SECONDARY: Rgb = [100, 116, 139]; // slate-500

/** The structural choices a preset makes, for components that branch on them. */
export interface ThemeShape {
  presetId: string;
  cardStyle: CardStyle;
  heroStyle: HeroStyle;
}

export type ThemeVars = Record<string, string>;

/**
 * The families the root layout actually loads, by the name Manager's picker
 * stores. A face that is not loaded renders as the browser's UI font, so a
 * merchant's choice has to resolve to one of these or it does nothing.
 */
const LOADED_FONTS: Record<string, string> = {
  // Sans
  inter: 'var(--font-inter)',
  poppins: 'var(--font-poppins)',
  roboto: 'var(--font-roboto)',
  lato: 'var(--font-lato)',
  montserrat: 'var(--font-montserrat)',
  'dm sans': 'var(--font-dm-sans)',
  'work sans': 'var(--font-work-sans)',
  figtree: 'var(--font-figtree)',
  // Display
  'playfair display': 'var(--font-playfair)',
  playfair: 'var(--font-playfair)',
  'dm serif display': 'var(--font-dm-serif)',
  'dm serif': 'var(--font-dm-serif)',
  'cormorant garamond': 'var(--font-cormorant)',
  cormorant: 'var(--font-cormorant)',
  'libre baskerville': 'var(--font-baskerville)',
  baskerville: 'var(--font-baskerville)',
  lora: 'var(--font-lora)',
  'space grotesk': 'var(--font-space-grotesk)',
};

/**
 * Resolves a merchant's font name to a loaded family, falling back to the
 * preset's. An unrecognised name is still quoted through — a deployment may
 * add a face we do not know about here.
 */
function fontStack(family: string | null | undefined, fallback: string): string {
  const name = (family ?? '').trim();
  if (!name) return fallback;
  const loaded = LOADED_FONTS[name.toLowerCase()];
  if (loaded) return loaded;
  return /^['"]/.test(name) || !/\s/.test(name) ? name : `'${name}'`;
}

/**
 * One palette, written under a prefix.
 *
 * Both palettes ship as plain custom properties in a single inline style on
 * <html> — `--l-*` for light, `--d-*` for dark — and globals.css points the
 * real `--color-*` tokens at one set or the other depending on `.dark`. The
 * alternative, a <style> tag holding `:root` and `:root.dark` blocks, put a
 * React-owned node in <head>, where react-hot-toast's runtime `<style
 * id="_goober">` lands first and breaks hydration.
 */
function paletteVars(prefix: string, p: Palette, accent: Rgb, accent2: Rgb): ThemeVars {
  return {
    [`--${prefix}-bg`]: triplet(p.bg),
    [`--${prefix}-surface`]: triplet(p.surface),
    [`--${prefix}-surface-alt`]: triplet(p.surfaceAlt),
    [`--${prefix}-border`]: triplet(p.border),
    [`--${prefix}-fg`]: triplet(p.fg),
    [`--${prefix}-fg-muted`]: triplet(p.fgMuted),
    [`--${prefix}-fg-subtle`]: triplet(p.fgSubtle),
    [`--${prefix}-primary`]: triplet(accent),
    [`--${prefix}-primary-fg`]: triplet(readableOn(accent)),
    [`--${prefix}-secondary`]: triplet(accent2),
    [`--${prefix}-secondary-fg`]: triplet(readableOn(accent2)),
  };
}

/**
 * A whole light palette derived from one background colour.
 *
 * The Design screen has had a background picker since it shipped and the
 * storefront never read it, so a merchant could set the page background and
 * watch nothing change. Honouring one colour means deriving the rest: drop the
 * chosen colour in on its own and the text, the cards and the rules are all
 * still set for the preset's background, which is how a themeable storefront
 * ends up with grey-on-grey.
 *
 * The direction of every tint flips on how dark the choice is — a shop that
 * picks charcoal needs its surfaces lighter than the page, not darker.
 */
function paletteFromBackground(bg: Rgb, base: Palette): Palette {
  const dark = luminance(bg) < 0.4;
  const toward: Rgb = dark ? [255, 255, 255] : [0, 0, 0];
  const fg = readableOn(bg);
  return {
    ...base,
    bg,
    surface: mix(bg, toward, 0.04),
    surfaceAlt: mix(bg, toward, 0.08),
    border: mix(bg, fg, 0.16),
    fg,
    fgMuted: mix(fg, bg, 0.35),
    fgSubtle: mix(fg, bg, 0.55),
  };
}

export interface Theme {
  /** Both palettes plus the shared tokens — goes straight on <html style>. */
  vars: ThemeVars;
  shape: ThemeShape;
}

export function buildTheme(config: StorefrontConfig | null): Theme {
  const preset: ThemePreset = resolvePreset(config?.theme);

  const primary = parseHex(config?.primaryColor) ?? FALLBACK_PRIMARY;
  const secondary = parseHex(config?.secondaryColor) ?? FALLBACK_SECONDARY;

  // The merchant's own page background, when they set one. Only the light
  // palette: dark mode is a shopper's choice about their screen, and painting
  // their dark mode in a colour picked against white is how it stops being
  // dark mode.
  const chosenBg = parseHex(config?.backgroundColor);
  const light = chosenBg ? paletteFromBackground(chosenBg, preset.light) : preset.light;
  // A brand colour chosen against white can disappear on a background the
  // merchant picked afterwards, so it is lifted against whatever they chose —
  // but only then, so no existing store's brand colour shifts underneath it.
  const lightPrimary = chosenBg ? ensureContrast(primary, light.bg) : primary;
  const lightSecondary = chosenBg ? ensureContrast(secondary, light.bg) : secondary;

  return {
    vars: {
      ...paletteVars('l', light, lightPrimary, lightSecondary),
      // A brand colour is chosen against white. On a near-black page the deep
      // ones vanish, so dark mode gets a lifted copy rather than the same hex.
      ...paletteVars(
        'd',
        preset.dark,
        liftForDark(primary, preset.dark.bg),
        liftForDark(secondary, preset.dark.bg),
      ),
      '--radius': preset.radius,
      '--heading-tracking': preset.headingTracking,
      '--font-sans': fontStack(config?.font, preset.fontSans),
      // A merchant's heading font, or the preset's — NOT their body font.
      // Falling through to `font` made sense when every preset paired a face
      // with itself; now that presets pair a serif display with a sans body,
      // a merchant who set only a body font had the pairing silently replaced
      // by one face used twice.
      '--font-display': fontStack(config?.headingFont, preset.fontDisplay),
    },
    shape: {
      presetId: preset.id,
      cardStyle: preset.cardStyle,
      heroStyle: preset.heroStyle,
    },
  };
}

/**
 * Legacy name — still returns the style object React's `style` prop wants.
 */
export function buildThemeVars(config: StorefrontConfig | null): ThemeVars {
  return buildTheme(config).vars;
}
