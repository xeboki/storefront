/**
 * Storefront theme presets.
 *
 * `StorefrontConfig.theme` has existed in the API and the SDK since the
 * storefront was built, and nothing ever read it — every shop rendered the one
 * hardcoded look. A preset is what that field now selects.
 *
 * A preset owns the things a merchant should not have to pick one at a time:
 * the neutral ramp (which decides how the page reads in light *and* dark), the
 * corner radius, the type pairing, and two structural choices. The merchant's
 * own brand colours stay theirs and are layered on top — a preset never
 * overrides primaryColor.
 */

export type Rgb = [number, number, number];

/** The neutrals a page is built from. Ordered light → dark, as the eye sees it. */
export interface Palette {
  /** Page background. */
  bg: Rgb;
  /** Card / panel background, sitting on `bg`. */
  surface: Rgb;
  /** Subtle fill: inputs, skeletons, table stripes. */
  surfaceAlt: Rgb;
  /** Hairlines and dividers. */
  border: Rgb;
  /** Body text. */
  fg: Rgb;
  /** Secondary text — captions, helper lines, nav links. */
  fgMuted: Rgb;
  /** Dimmest legible text — placeholders, decorative icons, timestamps. */
  fgSubtle: Rgb;
}

/** How product cards are drawn. Changes the shop's character more than colour does. */
export type CardStyle = 'bordered' | 'elevated' | 'plain';

/** How the home hero is drawn. */
export type HeroStyle = 'banner' | 'split' | 'minimal';

export interface ThemePreset {
  id: string;
  /** Shown in Manager's theme picker. */
  name: string;
  /** One line telling a merchant what they are choosing. */
  description: string;
  light: Palette;
  dark: Palette;
  /** Base corner radius, as a CSS length. */
  radius: string;
  /** Font stack for body copy. A merchant `font` overrides this. */
  fontSans: string;
  /** Font stack for headings. A merchant `heading_font` overrides this. */
  fontDisplay: string;
  cardStyle: CardStyle;
  heroStyle: HeroStyle;
  /** Extra letter-spacing on headings, as a CSS length. */
  headingTracking: string;
}

// Tailwind's ramps, so the presets sit next to the palette the rest of the app
// already speaks. slate = cool, zinc = neutral, stone = warm.
const SLATE = {
  50: [248, 250, 252], 100: [241, 245, 249], 200: [226, 232, 240],
  300: [203, 213, 225],
  400: [148, 163, 184], 500: [100, 116, 139], 600: [71, 85, 105],
  700: [51, 65, 85], 800: [30, 41, 59], 900: [15, 23, 42], 950: [2, 6, 23],
} as const;
const ZINC = {
  50: [250, 250, 250], 100: [244, 244, 245], 200: [228, 228, 231],
  300: [212, 212, 216],
  400: [161, 161, 170], 500: [113, 113, 122], 600: [82, 82, 91],
  700: [63, 63, 70], 800: [39, 39, 42], 900: [24, 24, 27], 950: [9, 9, 11],
} as const;
const STONE = {
  50: [250, 250, 249], 100: [245, 245, 244], 200: [231, 229, 228],
  300: [214, 211, 209],
  400: [168, 162, 158], 500: [120, 113, 108], 600: [87, 83, 78],
  700: [68, 64, 60], 800: [41, 37, 36], 900: [28, 25, 23], 950: [12, 10, 9],
} as const;

type Ramp = typeof SLATE | typeof ZINC | typeof STONE;

/*
 * `fgSubtle` sits one step further from its ground than it used to.
 *
 * It was ramp 400 on white and ramp 500 on a 950 ground, which came out at
 * 3-4:1 — below the 4.5 AA floor, in EVERY preset, in both themes, on every
 * ground. The binding case is a tinted band: ramp 500 clears 4.76 on white
 * and only 4.34 on `surfaceAlt`, so the step had to move twice, and
 * `fgMuted` with it. The colour whose own comment calls it "the dimmest legible text"
 * was not legible anywhere, and nothing checked: `scale.test.ts` holds the
 * twelve-step scale to APCA and these palettes had no contrast assertion at
 * all. `presets.test.ts` is that assertion now.
 *
 * Dark also moves `fgMuted` a step lighter, so the two roles stay a step
 * apart rather than collapsing onto each other. That needed a 300 on each
 * ramp — these are Tailwind's slate, zinc and stone, which have one; it had
 * simply never been copied across, and without it dark had no legible step
 * between `fgMuted` and the ground.
 */
function lightFrom(r: Ramp): Palette {
  return {
    bg: [255, 255, 255],
    surface: [255, 255, 255],
    surfaceAlt: [...r[100]] as Rgb,
    border: [...r[200]] as Rgb,
    fg: [...r[900]] as Rgb,
    fgMuted: [...r[700]] as Rgb,
    fgSubtle: [...r[600]] as Rgb,
  };
}

function tintedLightFrom(r: Ramp): Palette {
  // Page sits one step down from the cards, so cards read as raised without a
  // shadow. This is what makes "minimal" and "warm" feel unlike "classic".
  return {
    bg: [...r[50]] as Rgb,
    surface: [255, 255, 255],
    surfaceAlt: [...r[100]] as Rgb,
    border: [...r[200]] as Rgb,
    fg: [...r[900]] as Rgb,
    fgMuted: [...r[700]] as Rgb,
    fgSubtle: [...r[600]] as Rgb,
  };
}

function darkFrom(r: Ramp): Palette {
  return {
    bg: [...r[950]] as Rgb,
    surface: [...r[900]] as Rgb,
    surfaceAlt: [...r[800]] as Rgb,
    border: [...r[800]] as Rgb,
    fg: [...r[50]] as Rgb,
    fgMuted: [...r[300]] as Rgb,
    fgSubtle: [...r[400]] as Rgb,
  };
}

// The faces the root layout loads. A merchant's own `font` / `heading_font`
// still overrides these — a preset only says what to fall back to.
const INTER = 'var(--font-inter)';
const SERIF = 'var(--font-playfair)';
const SYSTEM = 'system-ui';

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'White cards on white, hairline borders. The safe default.',
    light: lightFrom(SLATE),
    dark: darkFrom(SLATE),
    radius: '0.5rem',
    fontSans: INTER,
    fontDisplay: SERIF,
    cardStyle: 'bordered',
    heroStyle: 'banner',
    headingTracking: '0',
  },
  {
    id: 'modern',
    name: 'Modern',
    description: 'Tight corners, heavy headings, high contrast. Reads as new.',
    light: lightFrom(ZINC),
    dark: darkFrom(ZINC),
    radius: '0.25rem',
    fontSans: INTER,
    fontDisplay: INTER,
    cardStyle: 'plain',
    heroStyle: 'split',
    headingTracking: '-0.02em',
  },
  {
    id: 'warm',
    name: 'Warm',
    description: 'Cream page, soft corners, a serif for headings. Good for food and craft.',
    light: tintedLightFrom(STONE),
    dark: darkFrom(STONE),
    radius: '0.875rem',
    fontSans: INTER,
    fontDisplay: SERIF,
    cardStyle: 'elevated',
    heroStyle: 'split',
    headingTracking: '0',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Square edges, no shadows, lots of air. Lets the photography carry it.',
    light: tintedLightFrom(ZINC),
    dark: darkFrom(ZINC),
    radius: '0',
    fontSans: SYSTEM,
    fontDisplay: SYSTEM,
    cardStyle: 'plain',
    heroStyle: 'minimal',
    headingTracking: '-0.01em',
  },
  {
    id: 'bold',
    name: 'Bold',
    description: 'Dark surfaces even in light mode, big type. Built to shout.',
    light: {
      bg: [...SLATE[50]] as Rgb,
      surface: [255, 255, 255],
      surfaceAlt: [...SLATE[200]] as Rgb,
      border: [...SLATE[400]] as Rgb,
      fg: [...SLATE[950]] as Rgb,
      fgMuted: [...SLATE[700]] as Rgb,
      // 600, not 500, and for a sharper reason than the shared builders:
      // this preset's `surfaceAlt` is a step darker than theirs, so 500
      // came out at 3.86:1 here when it cleared elsewhere. A hand-written
      // palette does not get the shared fix for free.
      fgSubtle: [...SLATE[600]] as Rgb,
    },
    dark: darkFrom(SLATE),
    radius: '0.125rem',
    fontSans: INTER,
    fontDisplay: INTER,
    cardStyle: 'bordered',
    heroStyle: 'banner',
    headingTracking: '-0.03em',
  },
  {
    id: 'vibrant',
    name: 'Vibrant',
    description: 'Pill corners and raised cards. Playful — suits gifts and toys.',
    light: tintedLightFrom(SLATE),
    dark: darkFrom(SLATE),
    radius: '1rem',
    fontSans: INTER,
    fontDisplay: SERIF,
    cardStyle: 'elevated',
    heroStyle: 'split',
    headingTracking: '-0.01em',
  },
];

export const DEFAULT_PRESET_ID = 'classic';

/** Unknown ids fall back to Classic rather than rendering an unstyled page. */
export function resolvePreset(id: string | null | undefined): ThemePreset {
  return (
    THEME_PRESETS.find((p) => p.id === (id ?? '').trim().toLowerCase()) ??
    THEME_PRESETS.find((p) => p.id === DEFAULT_PRESET_ID)!
  );
}
