/**
 * JSON-LD structured data generators.
 * Call these in generateMetadata() or directly in page <head> via next/script.
 *
 * All generators return a plain object suitable for:
 *   <script type="application/ld+json">{JSON.stringify(generateOrganization(...))}</script>
 */
import type { StoreConfig, StorefrontConfig, OrderingProduct, BlogPost } from '@xeboki/sdk';

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? 'xeboki.store';

function storeUrl(storeSlug: string, storefrontConfig: StorefrontConfig | null): string {
  if (storefrontConfig?.customDomain) return `https://${storefrontConfig.customDomain}`;
  return `https://${storeSlug}.${BASE_DOMAIN}`;
}

// ── Organization / LocalBusiness ──────────────────────────────────────────────

export function generateOrganization(
  storeSlug: string,
  storeConfig: StoreConfig,
  storefrontConfig: StorefrontConfig | null,
) {
  const base = storeUrl(storeSlug, storefrontConfig);
  const address = storeConfig.address as Record<string, string> | undefined;

  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: storeConfig.businessName,
    url: base,
    ...(storefrontConfig?.logoUrl && { logo: storefrontConfig.logoUrl }),
    ...(storeConfig.supportEmail && { email: storeConfig.supportEmail }),
    ...(storeConfig.supportPhone && { telephone: storeConfig.supportPhone }),
    ...(storeConfig.website && { sameAs: [storeConfig.website] }),
    ...(address && {
      address: {
        '@type': 'PostalAddress',
        streetAddress: address.line1 ?? '',
        addressLocality: address.city ?? '',
        addressRegion: address.state ?? '',
        postalCode: address.postcode ?? '',
        addressCountry: address.country ?? '',
      },
    }),
  };
}

// ── Product ───────────────────────────────────────────────────────────────────

export function generateProduct(
  storeSlug: string,
  product: OrderingProduct,
  storefrontConfig: StorefrontConfig | null,
  storeConfig: StoreConfig,
) {
  const base = storeUrl(storeSlug, storefrontConfig);

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description ?? undefined,
    ...(product.imageUrl && { image: [product.imageUrl] }),
    brand: {
      '@type': 'Brand',
      name: storeConfig.businessName,
    },
    offers: {
      '@type': 'Offer',
      priceCurrency: storeConfig.currencyCode ?? 'USD',
      price: (product.price ?? 0).toFixed(2),
      availability: product.isActive
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      url: `${base}/product/${product.id}`,
    },
  };
}

// ── BlogPosting ───────────────────────────────────────────────────────────────

export function generateBlogPosting(
  storeSlug: string,
  post: BlogPost,
  storefrontConfig: StorefrontConfig | null,
  storeConfig: StoreConfig,
) {
  const base = storeUrl(storeSlug, storefrontConfig);

  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.seoTitle ?? post.title,
    description: post.seoDescription ?? post.excerpt ?? undefined,
    datePublished: post.publishedAt ?? post.createdAt,
    dateModified: post.updatedAt,
    ...(post.featuredImageUrl && { image: [post.featuredImageUrl] }),
    ...(post.authorName && {
      author: { '@type': 'Person', name: post.authorName },
    }),
    publisher: {
      '@type': 'Organization',
      name: storeConfig.businessName,
      ...(storefrontConfig?.logoUrl && {
        logo: { '@type': 'ImageObject', url: storefrontConfig.logoUrl },
      }),
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${base}/blog/${post.slug}`,
    },
  };
}

// ── BreadcrumbList ────────────────────────────────────────────────────────────

export function generateBreadcrumbs(
  storeSlug: string,
  storefrontConfig: StorefrontConfig | null,
  items: Array<{ name: string; path: string }>,
) {
  const base = storeUrl(storeSlug, storefrontConfig);

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${base}/` },
      ...items.map((item, i) => ({
        '@type': 'ListItem',
        position: i + 2,
        name: item.name,
        item: `${base}${item.path}`,
      })),
    ],
  };
}
