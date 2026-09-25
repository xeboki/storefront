'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useColorScheme, type ColorScheme } from './color-scheme';

const OPTIONS: { value: ColorScheme; label: string; Icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: Monitor },
];

/**
 * Appearance control, in two sizes.
 *
 * `compact` is one button that cycles light → dark → system, for places where
 * three side-by-side buttons are more furniture than the setting deserves —
 * the header, mainly, where it was crowding out the things people came to use.
 * The icon shows the current mode and the label names the next one, so the
 * cycle is discoverable without three permanent buttons.
 *
 * `system` stays an option either way: a shopper who has never touched it
 * should be able to see the shop is following their phone, not guessing.
 */
export function ColorSchemeToggle({
  className = '',
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const { scheme, setScheme } = useColorScheme();

  if (compact) {
    const index = OPTIONS.findIndex((o) => o.value === scheme);
    const current = OPTIONS[index === -1 ? 2 : index];
    const next = OPTIONS[(index === -1 ? 2 : index + 1) % OPTIONS.length];
    const { Icon } = current;
    return (
      <button
        type="button"
        onClick={() => setScheme(next.value)}
        aria-label={`Appearance: ${current.label}. Switch to ${next.label}.`}
        title={`Appearance: ${current.label}`}
        className={`flex h-9 w-9 items-center justify-center rounded-brand border border-line text-fg-muted transition-colors hover:text-fg ${className}`}
      >
        <Icon className="h-4 w-4" />
      </button>
    );
  }

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
