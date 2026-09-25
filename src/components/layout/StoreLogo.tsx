import { ProductImage } from '@/components/product/ProductImage';

interface Props {
  logoUrl?: string | null;
  name: string;
  className?: string;
}

/**
 * The shop's mark: its logo, or a monogram built from its name.
 *
 * With no logo the header fell back to the shop's name set as plain text,
 * which left the corner of every page looking like an unstyled link rather
 * than a brand. A single letter in a tile is what every product does when it
 * has no artwork, and it is the one mark that cannot be missing.
 *
 * The initial comes from the DISPLAY name, so a shop whose signup name was
 * mistyped does not get the wrong letter.
 */
export function StoreLogo({ logoUrl, name, className = '' }: Props) {
  // First letter of the first word that actually starts with one — leading
  // punctuation and stray spaces are common in a name somebody typed once.
  const initial =
    name
      .split(/\s+/)
      .map((word) => word.replace(/[^\p{L}\p{N}]/gu, ''))
      .find((word) => word.length > 0)
      ?.charAt(0)
      .toUpperCase() ?? '·';

  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <ProductImage
        src={logoUrl}
        alt={name}
        width={140}
        height={36}
        className="h-9 w-auto object-contain"
        fallback={
          <span
            aria-hidden
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-brand bg-primary text-sm font-semibold text-primary-foreground"
          >
            {initial}
          </span>
        }
      />
      {/* The name sits beside the monogram, because one letter on its own says
          nothing to a first-time visitor. With a real logo it would compete,
          so it only appears alongside the fallback. */}
      {!logoUrl && (
        <span className="hidden truncate text-base font-semibold text-fg sm:inline">
          {name}
        </span>
      )}
    </span>
  );
}
