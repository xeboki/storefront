import Link from 'next/link';
import { ProductImage } from '@/components/product/ProductImage';
import type { StoreConfig, StorefrontConfig } from '@xeboki/sdk';

interface Props {
  storefrontConfig: StorefrontConfig | null;
  storeConfig: StoreConfig;
  storeSlug: string;
}

export function HeroSection({ storefrontConfig, storeConfig, storeSlug }: Props) {
  const title = storefrontConfig?.heroTitle ?? storeConfig.businessName;
  const subtitle = storefrontConfig?.heroSubtitle ?? 'Shop our latest products';
  const bgImage = storefrontConfig?.heroImageUrl;

  return (
    <section className="relative overflow-hidden bg-primary">
      {/* A hero image that fails leaves the primary-coloured band, which is a
          perfectly good hero — not a torn-image icon across the top of the shop. */}
      <ProductImage
        src={bgImage}
        alt=""
        fill
        className="object-cover opacity-30"
        priority
        fallback={null}
      />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
        <div className="max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground leading-tight">
            {title}
          </h1>
          <p className="mt-4 text-lg text-primary-foreground/80">{subtitle}</p>
          {/* The hero is bg-primary in BOTH schemes, so its contents key off
              primary rather than the page surface — otherwise this button goes
              dark-on-green the moment a shopper switches to dark mode. */}
          <Link
            href={`/${storeSlug}/catalog`}
            className="mt-8 inline-block px-6 py-3 bg-primary-foreground text-primary font-semibold rounded-brand hover:opacity-90 transition-opacity"
          >
            Shop Now
          </Link>
        </div>
      </div>
    </section>
  );
}
