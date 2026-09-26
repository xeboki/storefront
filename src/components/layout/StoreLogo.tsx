import { ProductImage } from '@/components/product/ProductImage';
import { monogram } from '@/lib/monogram';

interface Props {
  logoUrl?: string | null;
  name: string;
  className?: string;
  /** Larger for a footer or a standalone mark; default suits a header row. */
  size?: 'sm' | 'md';
}

/**
 * The shop's mark: its logo, or a monogram built from its name.
 *
 * The monogram is not a placeholder square with a letter dropped in it. It is
 * set in the shop's OWN display face — the serif or grotesk the merchant
 * picked for their headings — so two shops using this never get the same mark.
 * A squircle rather than a rounded rectangle, a diagonal sheen so the tile
 * reads as an object rather than a swatch, and a hairline inset so it keeps an
 * edge against both a white header and a dark one.
 *
 * The wordmark beside it is set in the same face, tracked in a little. A serif
 * monogram next to a bold sans name looked like two brands standing together;
 * one face makes it a lockup.
 *
 * The letter comes from the DISPLAY name, so a shop whose signup name was
 * mistyped does not get the wrong one.
 */
export function StoreLogo({ logoUrl, name, className = '', size = 'sm' }: Props) {
  const initial = monogram(name);
  const tile = size === 'md' ? 'h-11 w-11 text-xl' : 'h-9 w-9 text-lg';
  const word = size === 'md' ? 'text-lg' : 'text-base';

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
            className={`relative grid flex-shrink-0 place-items-center overflow-hidden
              rounded-[35%] bg-primary text-primary-foreground shadow-sm
              ring-1 ring-inset ring-white/20 ${tile}`}
          >
            {/* Light falling across it from the top left. Flat colour is what
                made the tile read as a missing image rather than a mark. */}
            <span
              aria-hidden
              className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-black/25"
            />
            <span className="relative font-display leading-none">{initial}</span>
          </span>
        }
      />
      {/* The name sits beside the monogram, because one letter on its own says
          nothing to a first-time visitor. With a real logo it would compete,
          so it only appears alongside the fallback. */}
      {!logoUrl && (
        <span
          className={`hidden truncate font-display font-semibold tracking-tight text-fg sm:inline ${word}`}
        >
          {name}
        </span>
      )}
    </span>
  );
}
