/**
 * Product detail page.
 * Slug-based URL for SEO. ISR: 60s revalidation.
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { loadStore, loadProduct } from '@/lib/sdk/store';
import { ProductDetail } from '@/components/product/ProductDetail';
import { generateProduct, generateBreadcrumbs } from '@/lib/seo/structured-data';

interface Props {
  params: { store: string; slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolved = await loadStore(params.store);
  if (!resolved) return {};
  const product = await loadProduct(resolved.apiKey, params.slug);
  if (!product) return {};

  const ogImages = product.imageUrl
    ? [{ url: product.imageUrl, alt: product.name }]
    : resolved.storefrontConfig?.seoOgImageUrl
    ? [{ url: resolved.storefrontConfig.seoOgImageUrl }]
    : [];

  return {
    title: product.name,
    description: product.description ?? `Buy ${product.name} at ${resolved.storeConfig.businessName}`,
    openGraph: {
      title: product.name,
      description: product.description ?? '',
      images: ogImages,
      type: 'website',
    },
    twitter: { card: 'summary_large_image', images: ogImages.map((i) => i.url) },
  };
}

export default async function ProductPage({ params }: Props) {
  const resolved = await loadStore(params.store);
  if (!resolved) notFound();

  const product = await loadProduct(resolved.apiKey, params.slug);
  if (!product) notFound();

  const { storeConfig, storefrontConfig } = resolved;
  const productJsonLd = generateProduct(params.store, product, storefrontConfig, storeConfig);
  const breadcrumbJsonLd = generateBreadcrumbs(params.store, storefrontConfig, [
    { name: 'Shop', path: '/catalog' },
    { name: product.name, path: `/product/${params.slug}` },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ProductDetail product={product} storeSlug={params.store} />
      </div>
    </>
  );
}
