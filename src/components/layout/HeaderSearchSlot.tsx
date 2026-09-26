'use client';

/**
 * Where the search field sits in the header, how wide it is, and whether it is
 * a field or an icon that opens into the space it has.
 *
 * Three decisions, not one setting. They used to be a single four-way choice —
 * full | compact | icon | off — which meant a shop could not have a short box
 * on the right, or an icon that opened to a fixed width, because those
 * combinations had no name. Named sizes rather than measurements, though: a
 * header is a row of things that have to fit beside each other, and a merchant
 * typing pixels into it is a merchant breaking their own header on a laptop.
 */
import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { clsx } from 'clsx';
import { HeaderSearch } from './HeaderSearch';
import { useT } from '@/lib/i18n/client';

interface Props {
  storeSlug: string;
  /** left | centre | right */
  placement: string;
  /** fill | small | medium | large */
  width: string;
  /** open | tap */
  behaviour: string;
  iconClassName: string;
}

const WIDTHS: Record<string, string> = {
  small: 'w-56 lg:w-64',
  medium: 'w-72 lg:w-96',
  large: 'w-96 lg:w-[32rem]',
};

export function HeaderSearchSlot({
  storeSlug, placement, width, behaviour, iconClassName,
}: Props) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const fieldRef = useRef<HTMLDivElement>(null);

  // Opening it and leaving the cursor somewhere else is a button that looks
  // like it did nothing.
  useEffect(() => {
    if (open) fieldRef.current?.querySelector('input')?.focus();
  }, [open]);

  const fills = width === 'fill';
  const measure = fills ? 'flex-1' : WIDTHS[width] ?? WIDTHS.small;

  if (behaviour === 'tap') {
    return (
      <>
        {/* The spacer decides which side it opens from: an icon on the right
            has to grow leftward into the bar, not push the cart off it. */}
        {placement !== 'left' && <span className="flex-1" aria-hidden />}
        <div
          className={clsx(
            'hidden items-center justify-end md:flex',
            // Animating to `auto` is not possible, so the field grows by
            // max-width. Closed it is zero and cannot be tabbed into.
            'motion-safe:transition-[max-width] motion-safe:duration-300 motion-safe:ease-out',
            open ? (fills ? 'w-full max-w-2xl' : `${measure} max-w-full`) : 'max-w-0',
          )}
        >
          <div ref={fieldRef} className={clsx('w-full overflow-hidden', !open && 'invisible')}>
            <HeaderSearch storeSlug={storeSlug} />
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={t('search.placeholder')}
          className={clsx(iconClassName, 'hidden md:flex')}
        >
          {open ? <X size={20} /> : <Search size={20} />}
        </button>
        {placement === 'left' && <span className="flex-1" aria-hidden />}
      </>
    );
  }

  return (
    <>
      {/* `fill` eats the row, so there is nothing for placement to decide. */}
      {!fills && placement !== 'left' && <span className="flex-1" aria-hidden />}
      <HeaderSearch storeSlug={storeSlug} className={clsx('hidden md:block', measure)} />
      {!fills && placement !== 'right' && <span className="flex-1" aria-hidden />}
    </>
  );
}
