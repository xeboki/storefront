/**
 * The page's outer rhythm, so every band sits on the same grid.
 *
 * Its own module, not a helper inside the shop bands, because the client
 * bands share it — and the shop bands reach for `@/lib/location`, which reads
 * `next/headers`. Importing a server-only module into a `'use client'` file
 * fails the build, and it failed it here: a layout primitive has no business
 * living next to server code.
 */
/**
 * The page's vertical rhythm, in one place.
 *
 * The gap between two bands is this padding TWICE — one band's floor plus
 * the next one's ceiling. At the old `lg:py-32` that was **256px** of empty
 * page between a paragraph and the next heading: more than a quarter of a
 * laptop screen, which reads as the page having ended rather than as a new
 * section. `lg:py-20` makes it 160px — still generous for an editorial
 * shop, and about four times the 40px that separates a heading from its own
 * content, which is the relationship that makes a break legible.
 *
 * Exported because two other places had their OWN copy of the old scale and
 * went out of step the moment this one changed: `CollectionBand`, which
 * cannot use `Band` (it bleeds and clips), and the `imageText` overlay,
 * which was a flat `py-24` at every width. A page rhythm with three
 * definitions is three rhythms.
 */
export const BAND_RHYTHM = 'py-12 sm:py-16 lg:py-20';

/** For a band that is a strip rather than a section — a trust row, a card. */
export const BAND_RHYTHM_TIGHT = 'py-10 sm:py-12';

export function Band({
  children, tight = false, nested = false, fill = false,
}: {
  children: React.ReactNode;
  tight?: boolean;
  /**
   * Take the whole column's height.
   *
   * For a block that reads as a panel — a coloured card, a picture tile.
   * The grid stretches every column to the tallest, so a short panel beside
   * a long carousel floated at the top with a hole under it. A list or a
   * heading does NOT want this: stretching a list of three products to 600px
   * just moves the hole inside the list.
   */
  fill?: boolean;
  /**
   * Inside a column.
   *
   * A band in a column must NOT bring the page gutter or the full-width
   * padding with it — the row already supplied both, and applying them again
   * is how a block ends up inset from an inset and half the width it was
   * given. It also drops the rule above it: a hairline across a third of the
   * page reads as a mistake rather than a division.
   */
  nested?: boolean;
}) {
  if (nested) return <div className={fill ? 'h-full' : undefined}>{children}</div>;
  return (
    <section>
      <div className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 ${
        tight ? BAND_RHYTHM_TIGHT : BAND_RHYTHM}`}>
        {children}
      </div>
    </section>
  );
}
