'use client';

/**
 * Language picker, in the header where a shopper looks for it.
 *
 * The dictionaries and `t()` have always been here; the store layout resolved
 * the locale from the deployment default and offered no way to change it, so
 * the shop was multilingual only in theory.
 */
import { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

/** Shown as the flag + label. Keys are the locale codes in dictionaries.ts. */
const LANGUAGES: Record<string, { flag: string; label: string; native: string }> = {
  en: { flag: '🇬🇧', label: 'EN', native: 'English' },
  es: { flag: '🇪🇸', label: 'ES', native: 'Español' },
  fr: { flag: '🇫🇷', label: 'FR', native: 'Français' },
  de: { flag: '🇩🇪', label: 'DE', native: 'Deutsch' },
  ar: { flag: '🇸🇦', label: 'AR', native: 'العربية' },
  ur: { flag: '🇵🇰', label: 'UR', native: 'اردو' },
};

function describe(code: string) {
  return LANGUAGES[code] ?? { flag: '🌐', label: code.toUpperCase(), native: code.toUpperCase() };
}

interface Props {
  locales: string[];
  active: string;
  className?: string;
}

export function LanguageSwitcher({ locales, active, className = '' }: Props) {
  const [open, setOpen] = useState(false);
  // One language is not a choice — showing a menu onto a single option is noise.
  if (locales.length < 2) return null;

  const current = describe(active);

  function choose(code: string) {
    setOpen(false);
    if (code === active) return;
    // A full navigation: the middleware has to see ?lang to remember it, and
    // every string already on the page was rendered in the old language.
    const url = new URL(window.location.href);
    url.searchParams.set('lang', code);
    window.location.href = url.toString();
  }

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Language: ${current.native}`}
        className="flex items-center gap-1 rounded-brand px-1.5 py-1.5 text-sm font-medium text-fg-muted transition-colors hover:text-fg"
      >
        <span aria-hidden className="text-base leading-none">{current.flag}</span>
        <span>{current.label}</span>
        <ChevronDown size={14} aria-hidden className="text-fg-subtle" />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close language list"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <ul
            role="listbox"
            className="absolute right-0 z-50 mt-1 min-w-[11rem] overflow-hidden rounded-brand border border-line bg-surface py-1 shadow-lg"
          >
            {locales.map((code) => {
              const lang = describe(code);
              const isActive = code === active;
              return (
                <li key={code}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onClick={() => choose(code)}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-fg transition-colors hover:bg-surface-alt"
                  >
                    <span aria-hidden className="text-base leading-none">{lang.flag}</span>
                    <span className="flex-1">{lang.native}</span>
                    {isActive && <Check size={15} className="text-primary" aria-hidden />}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
