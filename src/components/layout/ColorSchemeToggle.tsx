'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useColorScheme, type ColorScheme } from './color-scheme';

const OPTIONS: { value: ColorScheme; label: string; Icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: Monitor },
];

/**
 * Three-way segmented control. `system` is an option rather than an implicit
 * default, because a shopper who has never touched it should be able to see
 * that the shop is following their phone and not guessing.
 */
export function ColorSchemeToggle({ className = '' }: { className?: string }) {
  const { scheme, setScheme } = useColorScheme();

  return (
    <div
      role="radiogroup"
      aria-label="Colour scheme"
      className={`inline-flex items-center gap-0.5 rounded-brand border border-line bg-surface-alt p-0.5 ${className}`}
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = scheme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => setScheme(value)}
            className={`flex h-8 w-8 items-center justify-center rounded-brand-sm transition-colors ${
              active
                ? 'bg-surface text-fg shadow-sm'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}
