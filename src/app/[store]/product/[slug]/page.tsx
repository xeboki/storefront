/**
 * Product detail page.
 * Slug-based URL for SEO. ISR: 60s revalidation.
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { loadStore, loadProduct, loadUpsells } from '@/lib/sdk/store';
import { ProductDetail } from '@/components/product/ProductDetail';
import { ProductGrid } from '@/components/product/ProductGrid';
import { generateProduct, generateBreadcrumbs } from '@/lib/seo/structured-data';
import { activeLocation, activeLocationId, isLocationFirst, storeLabel } from '@/lib/location';

interface Props {
  params: { store: string; slug: string };
  searchParams: { loc?: string };
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

export default async function ProductPage({ params, searchParams }: Props) {
  const resolved = await loadStore(params.store);
  if (!resolved) notFound();

  // The page used to ask for the product with no location at all, so it showed
  // the whole business's stock while the listing beside it showed the branch's
  // — the same product read 157 here and 147 there.
  const store = activeLocation(resolved.storefrontConfig, searchParams.loc);
  const product = await loadProduct(
    resolved.apiKey,
    params.slug,
    activeLocationId(resolved.storefrontConfig, searchParams.loc),
  );
  if (!product) notFound();

  const upsells = (await loadUpsells(resolved.apiKey, product.id)).filter((p) => p.id !== product.id);

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
      {/* pb-28 on phones clears the sticky buy bar, which is fixed to the
          bottom and would otherwise sit over the end of the page. */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-28 sm:pb-8">
        <ProductDetail product={product} storeSlug={params.store} />
        {upsells.length > 0 && (
          <section className="mt-16">
            <h2 className="text-xl font-bold text-fg mb-6">You might also like</h2>
            <ProductGrid products={upsells.slice(0, 4)} storeSlug={params.store} />
          </section>
        )}
      </div>
    </>
  );
}
