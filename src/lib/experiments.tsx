'use client';

/**
 * Lightweight, dependency-free A/B testing.
 *
 * Register experiments below. `useExperiment(key)` assigns the visitor a
 * variant on first exposure (weighted, sticky via a 1-year cookie), fires a
 * GA4/Meta exposure event once, and returns the variant id so a component can
 * branch. Assignment is client-side (simple, no vendor); for zero-flicker SSR
 * you'd move assignment into middleware and read the cookie server-side.
 */
import { useEffect, useState } from 'react';
import { trackExperiment } from '@/lib/analytics';

export interface ExperimentVariant {
  id: string;
  weight: number; // relative weight
}

export interface Experiment {
  key: string;
  variants: ExperimentVariant[];
}

// ── Registry — add experiments here ───────────────────────────────────────────
// Example (disabled by default): a PDP add-to-cart button colour test.
//   { key: 'pdp_cta', variants: [{ id: 'control', weight: 1 }, { id: 'accent', weight: 1 }] }
export const EXPERIMENTS: Record<string, Experiment> = {};

function pickVariant(exp: Experiment): string {
  const total = exp.variants.reduce((n, v) => n + Math.max(0, v.weight), 0) || 1;
  let r = Math.random() * total;
  for (const v of exp.variants) {
    r -= Math.max(0, v.weight);
    if (r <= 0) return v.id;
  }
  return exp.variants[0]?.id ?? 'control';
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

function writeCookie(name: string, value: string): void {
  try {
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
  } catch {
    /* ignore */
  }
}

/**
 * Returns the assigned variant id for an experiment, or null while resolving /
 * if the experiment isn't registered. Fires the exposure event once.
 */
export function useExperiment(key: string): string | null {
  const [variant, setVariant] = useState<string | null>(null);

  useEffect(() => {
    const exp = EXPERIMENTS[key];
    if (!exp) return;
    const cookieName = `xbk_exp_${key}`;
    let assigned = readCookie(cookieName);
    const valid = assigned && exp.variants.some((v) => v.id === assigned);
    if (!valid) {
      assigned = pickVariant(exp);
      writeCookie(cookieName, assigned);
    }
    setVariant(assigned);
    trackExperiment(key, assigned!);
  }, [key]);

  return variant;
}
