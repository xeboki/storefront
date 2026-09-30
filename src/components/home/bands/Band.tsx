/**
 * The page's outer rhythm, so every band sits on the same grid.
 *
 * Its own module, not a helper inside the shop bands, because the client
 * bands share it — and the shop bands reach for `@/lib/location`, which reads
 * `next/headers`. Importing a server-only module into a `'use client'` file
 * fails the build, and it failed it here: a layout primitive has no business
 * living next to server code.
 */
export function Band({ children, bordered = true, tight = false, nested = false }: {
  children: React.ReactNode;
  bordered?: boolean;
  tight?: boolean;
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
  if (nested) return <div>{children}</div>;
  return (
    <section className={bordered ? 'border-t border-line' : undefined}>
      <div className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 ${
        tight ? 'py-10 sm:py-14' : 'py-14 sm:py-20 lg:py-32'}`}>
        {children}
      </div>
    </section>
  );
}
