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
import { SearchOverlay } from '../header/SearchOverlay';
import { useT } from '@/lib/i18n/client';

interface Props {
  storeSlug: string;
  /** left | centre | right */
  placement: string;
  /** fill | small | medium | large */
  width: string;
  /** open | tap | overlay */
  behaviour: string;
  /** The mark, which the overlay keeps so the open bar is still the shop's. */
  brand?: React.ReactNode;
  /** The account, saved and cart controls, which the overlay also keeps. */
  utilities?: React.ReactNode;
  container?: string;
  /**
   * Whether the box may push itself around with elastic spacers.
   *
   * False when something else in the bar already grows to fill it — an inline
   * menu. The spacers are `flex-1`, so they compete with that menu for the
   * same free space and win two thirds of it: the departments come out clipped
   * to a few letters beside a search box floating in the middle of nothing.
   *
   * With no spacers the box sits after whatever grows, which puts it beside
   * the icons — so placement is moot here, the same way `fill` makes it moot.
   */
  spacers?: boolean;
  iconClassName: string;
}

const WIDTHS: Record<string, string> = {
  small: 'w-56 lg:w-64',
  medium: 'w-72 lg:w-96',
  large: 'w-96 lg:w-[32rem]',
};

export function HeaderSearchSlot({
  storeSlug, placement, width, behaviour, spacers = true, iconClassName,
  brand = null, utilities = null,
  container = 'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8',
}: Props) {
  const t = useT();
  const [open, setOpen] = useState(false);
  /**
   * Open AND finished opening.
   *
   * The field grows by max-width, which only works if what is inside it is
   * clipped — and the suggestion panel hangs below the header, so it was
   * clipped too: typing found products and the list was cut off at the
   * header's edge. Nothing looked broken, the box just sat there spinning.
   *
   * So the clipping lasts exactly as long as the animation does.
   */
  const [settled, setSettled] = useState(false);
  const fieldRef = useRef<HTMLDivElement>(null);

  // Opening it and leaving the cursor somewhere else is a button that looks
  // like it did nothing.
  useEffect(() => {
    if (!open) {
      setSettled(false);
      return;
    }
    fieldRef.current?.querySelector('input')?.focus();
    // Matches the transition below. A timer rather than `transitionend`
    // because a reduced-motion browser fires no such event at all, and the
    // panel would then be clipped forever for the people most likely to need
    // it not to be.
    const done = setTimeout(() => setSettled(true), 320);
    return () => clearTimeout(done);
  }, [open]);

  const fills = width === 'fill';
  const measure = fills ? 'flex-1' : WIDTHS[width] ?? WIDTHS.small;
  /** `fill` leaves nothing to space, and neither does an elastic neighbour. */
  const pad = spacers && !fills;

  // Takes the header over rather than squeezing into it, so it needs none of
  // the placement and width below — there is nothing to place it beside.
  if (behaviour === 'overlay') {
    return (
      <SearchOverlay
        storeSlug={storeSlug}
        iconClassName={iconClassName}
        brand={brand}
        utilities={utilities}
        container={container}
      />
    );
  }

  if (behaviour === 'tap') {
    return (
      <>
        {/* The spacer decides which side it opens from: an icon on the right
            has to grow leftward into the bar, not push the cart off it. */}
        {pad && placement !== 'left' && <span className="flex-1" aria-hidden />}
        {/* The field and its close button are one control, so they sit in
            their own row. As separate children of the header they inherited
            its gap — which is spaced for icons standing apart, and left the
            cross floating a thumb's width from the box it closes. */}
        <div className="flex items-center">
          <div
            className={clsx(
              'hidden items-center justify-end md:flex',
            settled ? 'overflow-visible' : 'overflow-hidden',
              // Animating to `auto` is not possible, so the field grows by
              // max-width. Closed it is zero and cannot be tabbed into.
              'motion-safe:transition-[max-width] motion-safe:duration-300 motion-safe:ease-out',
              open ? (fills ? 'w-full max-w-2xl' : `${measure} max-w-full`) : 'max-w-0',
            )}
          >
            <div
              ref={fieldRef}
              className={clsx(
                'w-full',
                settled ? 'overflow-visible' : 'overflow-hidden',
                !open && 'invisible',
              )}
            >
              <HeaderSearch storeSlug={storeSlug} />
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={t('search.placeholder')}
            className={clsx(iconClassName, 'hidden md:flex', open && 'ms-0.5')}
          >
            {open ? <X size={20} /> : <Search size={20} />}
          </button>
        </div>
        {pad && placement === 'left' && <span className="flex-1" aria-hidden />}
      </>
    );
  }

  return (
    <>
      {/* `fill` eats the row, so there is nothing for placement to decide. */}
      {pad && placement !== 'left' && <span className="flex-1" aria-hidden />}
      <HeaderSearch storeSlug={storeSlug} className={clsx('hidden md:block', measure)} />
      {pad && placement !== 'right' && <span className="flex-1" aria-hidden />}
    </>
  );
}
