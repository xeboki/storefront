'use client';

/**
 * Light / dark / system, chosen by the shopper and remembered in their browser.
 *
 * The class lands on <html> before first paint via `colorSchemeScript` below —
 * do it in React and a dark-mode shopper gets a white flash on every navigation.
 */
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type ColorScheme = 'light' | 'dark' | 'system';

export const SCHEME_KEY = 'xeboki:scheme';

/**
 * Runs before paint, so it has to be dependency-free and must never throw:
 * Safari private mode throws on localStorage, and an exception here would stop
 * the rest of <head> executing.
 */
export const colorSchemeScript = `(function(){try{
var m=localStorage.getItem('${SCHEME_KEY}')||'system';
var d=m==='dark'||(m==='system'&&window.matchMedia('(prefers-color-scheme:dark)').matches);
document.documentElement.classList.toggle('dark',d);
}catch(e){}})();`;

function prefersDark(): boolean {
  return typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function apply(scheme: ColorScheme) {
  const dark = scheme === 'dark' || (scheme === 'system' && prefersDark());
  document.documentElement.classList.toggle('dark', dark);
}

interface Ctx {
  scheme: ColorScheme;
  /** What is actually on screen once `system` is resolved. */
  resolved: 'light' | 'dark';
  setScheme: (s: ColorScheme) => void;
}

const ColorSchemeContext = createContext<Ctx>({
  scheme: 'system',
  resolved: 'light',
  setScheme: () => {},
});

export function ColorSchemeProvider({ children }: { children: React.ReactNode }) {
  // Server render and first client render must agree, so start at the default
  // and read storage in an effect. The pre-paint script has already painted the
  // right colours by then — this state only drives the toggle's own label.
  const [scheme, setSchemeState] = useState<ColorScheme>('system');
  const [resolved, setResolved] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    let stored: ColorScheme = 'system';
    try {
      const raw = localStorage.getItem(SCHEME_KEY);
      if (raw === 'light' || raw === 'dark' || raw === 'system') stored = raw;
    } catch {
      /* storage blocked — stay on system */
    }
    setSchemeState(stored);
    setResolved(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  }, []);

  // Following the OS only means anything if we keep following it.
  useEffect(() => {
    if (scheme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      apply('system');
      setResolved(mq.matches ? 'dark' : 'light');
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [scheme]);

  const setScheme = useCallback((next: ColorScheme) => {
    setSchemeState(next);
    apply(next);
    setResolved(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    try {
      localStorage.setItem(SCHEME_KEY, next);
    } catch {
      /* storage blocked — the choice lasts this page only */
    }
  }, []);

  return (
    <ColorSchemeContext.Provider value={{ scheme, resolved, setScheme }}>
      {children}
    </ColorSchemeContext.Provider>
  );
}

export function useColorScheme(): Ctx {
  return useContext(ColorSchemeContext);
}
