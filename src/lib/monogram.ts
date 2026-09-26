/**
 * The letter a shop is known by when it has no logo.
 *
 * Every shop has a name; not every shop has artwork. A single letter in a tile
 * is the one mark that can never be missing, so it stands in for the logo
 * anywhere a logo would go — the header, the footer, the browser tab.
 *
 * The letter comes from the DISPLAY name, so a shop whose signup name was
 * mistyped does not get the wrong one.
 */
export function monogram(name: string): string {
  return (
    name
      .split(/\s+/)
      // Leading punctuation and stray spaces are common in a name somebody
      // typed once; the first letter of the first real word is what a person
      // would pick.
      .map((word) => word.replace(/[^\p{L}\p{N}]/gu, ''))
      .find((word) => word.length > 0)
      ?.charAt(0)
      .toUpperCase() ?? '·'
  );
}
