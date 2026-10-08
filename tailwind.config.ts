import typography from '@tailwindcss/typography';
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
      colors: {
        // The four things a shop says that are not its brand. Each carries
        // its own tint, hairline, solid fill and text, in light and dark —
        // which is what `bg-emerald-50` never had.
        success: {
          DEFAULT: 'rgb(var(--color-success-solid) / <alpha-value>)',
          bg: 'rgb(var(--color-success-bg) / <alpha-value>)',
          border: 'rgb(var(--color-success-border) / <alpha-value>)',
          fg: 'rgb(var(--color-success-fg) / <alpha-value>)',
          on: 'rgb(var(--color-success-on) / <alpha-value>)',
        },
        warning: {
          DEFAULT: 'rgb(var(--color-warning-solid) / <alpha-value>)',
          bg: 'rgb(var(--color-warning-bg) / <alpha-value>)',
          border: 'rgb(var(--color-warning-border) / <alpha-value>)',
          fg: 'rgb(var(--color-warning-fg) / <alpha-value>)',
          on: 'rgb(var(--color-warning-on) / <alpha-value>)',
        },
        danger: {
          DEFAULT: 'rgb(var(--color-danger-solid) / <alpha-value>)',
          bg: 'rgb(var(--color-danger-bg) / <alpha-value>)',
          border: 'rgb(var(--color-danger-border) / <alpha-value>)',
          fg: 'rgb(var(--color-danger-fg) / <alpha-value>)',
          on: 'rgb(var(--color-danger-on) / <alpha-value>)',
        },
        info: {
          DEFAULT: 'rgb(var(--color-info-solid) / <alpha-value>)',
          bg: 'rgb(var(--color-info-bg) / <alpha-value>)',
          border: 'rgb(var(--color-info-border) / <alpha-value>)',
          fg: 'rgb(var(--color-info-fg) / <alpha-value>)',
          on: 'rgb(var(--color-info-on) / <alpha-value>)',
        },
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
        // The shop's name when it has no logo. Falls through to the heading
        // face, which is what it used before this was a choice.
        wordmark: ['var(--font-wordmark)', 'var(--font-display)', 'var(--font-sans)', 'serif'],
      },
      borderRadius: {
        brand: 'var(--radius)',
        'brand-lg': 'calc(var(--radius) * 1.75)',
        'brand-sm': 'calc(var(--radius) * 0.5)',
      },
      letterSpacing: {
        heading: 'var(--heading-tracking)',
      },
      fontSize: {
        wordmark: 'var(--wordmark-size)',
      },
    },
  },
  plugins: [
    // Every `prose-*` class in the blog body was inert: the plugin that
    // defines them was never installed, so a post rendered with the global
    // reset and an <h2> came out SMALLER than the paragraph under it. On
    // every post, on every shop.
    typography,
  ],
};

export default config;
