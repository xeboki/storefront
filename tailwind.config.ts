import type { Config } from 'tailwindcss';

/**
 * Every colour here reads a CSS variable, and those variables are written twice
 * per store — once for :root and once for :root.dark — by src/lib/theme.ts.
 * That is what lets a shopper switch to dark without a round trip, and a
 * merchant switch preset without a rebuild.
 *
 * Use the semantic names (bg, fg, surface, border) rather than slate-N in
 * components: a literal neutral cannot follow the theme into dark mode.
 */
const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      keyframes: {
        // Shopify's "ambient movement": the picture drifts and swells very
        // slightly while its banner is up, so a still photograph does not look
        // like a stalled video. Slow and small on purpose — anything faster
        // reads as a bug, and it is applied motion-safe only.
        'hero-drift': {
          '0%, 100%': { transform: 'scale(1.06) translate3d(0, 0, 0)' },
          '50%': { transform: 'scale(1.12) translate3d(-1.5%, -1%, 0)' },
        },
      },
      animation: {
        'hero-drift': 'hero-drift 22s ease-in-out infinite',
      },
      colors: {
        primary: {
          DEFAULT: 'rgb(var(--color-primary) / <alpha-value>)',
          // The one to fill a shape with when words go on top of it.
          solid: 'rgb(var(--color-primary-solid) / <alpha-value>)',
          foreground: 'rgb(var(--color-primary-fg) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'rgb(var(--color-secondary) / <alpha-value>)',
          foreground: 'rgb(var(--color-secondary-fg) / <alpha-value>)',
        },
        // Page and panel neutrals — these are what change between light and dark.
        bg: 'rgb(var(--color-bg) / <alpha-value>)',
        surface: {
          DEFAULT: 'rgb(var(--color-surface) / <alpha-value>)',
          alt: 'rgb(var(--color-surface-alt) / <alpha-value>)',
        },
        fg: {
          DEFAULT: 'rgb(var(--color-fg) / <alpha-value>)',
          muted: 'rgb(var(--color-fg-muted) / <alpha-value>)',
          subtle: 'rgb(var(--color-fg-subtle) / <alpha-value>)',
        },
        line: 'rgb(var(--color-border) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        brand: 'var(--radius)',
        'brand-lg': 'calc(var(--radius) * 1.75)',
        'brand-sm': 'calc(var(--radius) * 0.5)',
      },
      letterSpacing: {
        heading: 'var(--heading-tracking)',
      },
    },
  },
  plugins: [],
};

export default config;
