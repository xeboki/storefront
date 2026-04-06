/**
 * Converts a StorefrontConfig into CSS custom properties injected at runtime.
 *
 * Uses RGB triplets (without the rgb() wrapper) so Tailwind's opacity modifier works:
 *   bg-primary/50  →  background: rgb(var(--color-primary) / 0.5)
 *
 * StorefrontConfig fields used: primaryColor, secondaryColor, font
 */
import type { StorefrontConfig } from '@xeboki/sdk';

const DEFAULTS = {
  primaryColor: '#0f172a',    // slate-900
  secondaryColor: '#64748b',  // slate-500
  font: 'Inter',
};

function hexToRgbTriplet(hex: string): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `${r} ${g} ${b}`;
}

/** Derives foreground color (black or white) based on background luminance */
function contrastFg(hex: string): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '15 23 42' : '255 255 255';
}

export interface ThemeVars {
  '--color-primary': string;
  '--color-primary-fg': string;
  '--color-secondary': string;
  '--color-secondary-fg': string;
  '--font-sans': string;
}

export function buildThemeVars(config: StorefrontConfig | null): ThemeVars {
  const primary = config?.primaryColor ?? DEFAULTS.primaryColor;
  const secondary = config?.secondaryColor ?? DEFAULTS.secondaryColor;
  const font = config?.font ?? DEFAULTS.font;

  return {
    '--color-primary': hexToRgbTriplet(primary),
    '--color-primary-fg': contrastFg(primary),
    '--color-secondary': hexToRgbTriplet(secondary),
    '--color-secondary-fg': contrastFg(secondary),
    '--font-sans': font,
  };
}

export function themeVarsToStyle(vars: ThemeVars): string {
  return Object.entries(vars)
    .map(([k, v]) => `${k}:${v}`)
    .join(';');
}
