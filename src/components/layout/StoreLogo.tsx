import { ProductImage } from '@/components/product/ProductImage';

interface Props {
  logoUrl?: string | null;
  name: string;
  className?: string;
  /** Larger for a footer or a standalone mark; default suits a header row. */
  size?: 'sm' | 'md';
}

/**
 * The shop's mark on the page: its logo, or its name set as a wordmark.
 *
 * No monogram tile. A letter in a coloured square is what a product does when
 * it has nothing to show — an avatar for a person who never uploaded one — and
 * on a shop's own header it reads as a missing image rather than as a brand.
 * A shop with no logo has a name, and a name set well IS a wordmark.
 *
 * It is set in the shop's own display face, the serif or grotesk the merchant
 * picked for their headings, so two shops using this never look the same. That
 * was the good half of the monogram and it survives here.
 *
 * The name is NOT hidden on a phone. It used to be — it sat beside a tile that
 * carried the mark on small screens — and with the tile gone that would leave
 * the header with no mark at all.
 *
 * The monogram itself is still how the FAVICON is drawn, and that is the right
 * place for it: sixteen pixels square has room for a letter and none for a
 * name.
 */
export function StoreLogo({ logoUrl, name, className = '', size = 'sm' }: Props) {
  const word = size === 'md' ? 'text-2xl' : 'text-xl';

  return (
    <span className={`flex min-w-0 items-center gap-2.5 ${className}`}>
      <ProductImage
        src={logoUrl}
        alt={name}
        width={140}
        height={36}
        className="h-9 w-auto object-contain"
        fallback={
          <span
            className={`truncate font-display font-semibold leading-none tracking-tight ${word}`}
          >
            {name}
          </span>
        }
      />
    </span>
  );
}
