'use client';

/**
 * A product image that falls back to the placeholder when it cannot load.
 *
 * Every call site asked only "is there a URL?" — so a product whose image URL
 * is dead (deleted asset, moved CDN, a host that no longer resolves) rendered
 * the browser's torn-image icon in the middle of the grid, and next/image's
 * optimizer logged a 500 for each one. A missing image and a broken image
 * should look the same to a shopper: like the product simply has no photo.
 */
import Image from 'next/image';
import { useState } from 'react';

interface Props {
  src: string | null | undefined;
  alt: string;
  /** Rendered instead of the image when there is none, or it fails. */
  fallback: React.ReactNode;
  /** `fill` needs a positioned ancestor; the fixed form needs width/height. */
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  className?: string;
  priority?: boolean;
}

export function ProductImage({
  src, alt, fallback, fill, width, height, sizes, className, priority,
}: Props) {
  // Keyed by URL, so a variation switch that changes the image gets a fresh
  // attempt rather than inheriting the previous one's failure.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (!src || failedSrc === src) return <>{fallback}</>;

  return (
    <Image
      src={src}
      alt={alt}
      {...(fill ? { fill: true } : { width: width ?? 80, height: height ?? 80 })}
      sizes={sizes}
      className={className}
      priority={priority}
      onError={() => setFailedSrc(src)}
    />
  );
}
