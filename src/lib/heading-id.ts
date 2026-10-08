/**
 * A heading's anchor.
 *
 * Its own module, and deliberately not inside `BlogBody`: that file is
 * `'use client'`, and a server component importing a named export from a
 * client module gets a client reference rather than the function — which
 * fails at request time with "headingId is not a function", not at build.
 *
 * Both sides derive the id the same way, so the contents list beside the
 * article links to headings that exist.
 */
export function headingId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}
