import Image from 'next/image';
import Link from 'next/link';
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
      {bgImage && (
        <Image
          src={bgImage}
          alt="Hero"
          fill
          className="object-cover opacity-30"
          priority
        />
      )}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
        <div className="max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground leading-tight">
            {title}
          </h1>
          <p className="mt-4 text-lg text-primary-foreground/80">{subtitle}</p>
          <Link
            href={`/${storeSlug}/catalog`}
            className="mt-8 inline-block px-6 py-3 bg-white text-primary font-semibold rounded-brand hover:bg-white/90 transition-colors"
          >
            Shop Now
          </Link>
        </div>
      </div>
    </section>
  );
}
