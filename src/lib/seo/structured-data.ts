/**
 * JSON-LD structured data generators.
 * Call these in generateMetadata() or directly in page <head> via next/script.
 *
 * All generators return a plain object suitable for:
 *   <script type="application/ld+json">{JSON.stringify(generateOrganization(...))}</script>
 */
import type { StoreConfig, StorefrontConfig, OrderingProduct, BlogPost, WeeklyHours } from '@xeboki/sdk';
import { storeName } from '@/lib/store-name';

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
    name: storeName(storeConfig),
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

/**
 * One branch as its own LocalBusiness, with a `branchOf` pointing at the shop.
 *
 * A chain that publishes only the business-level Organization gives search
 * engines one address for every store, which is exactly the problem a
 * per-location page exists to solve.
 */
export function generateLocalBranch(
  storeSlug: string,
  storefrontConfig: StorefrontConfig | null,
  storeConfig: StoreConfig,
  branch: {
    slug: string;
    name: string;
    city: string;
    address: string;
    serviceArea: string[];
    phone?: string | null;
    hours?: WeeklyHours | null;
  },
) {
  // schema.org wants the three-letter day form, and only the days we know.
  const DAY_CODE: Record<string, string> = {
    monday: 'Mo', tuesday: 'Tu', wednesday: 'We', thursday: 'Th',
    friday: 'Fr', saturday: 'Sa', sunday: 'Su',
  };
  const openingHours = Object.entries(branch.hours ?? {})
    .filter(([, slot]) => slot && !slot.closed && slot.opens && slot.closes)
    .map(([day, slot]) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: DAY_CODE[day],
      opens: slot!.opens,
      closes: slot!.closes,
    }));
  const base = storeUrl(storeSlug, storefrontConfig);
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${base}/l/${branch.slug}`,
    name: `${storeName(storeConfig)} — ${branch.name}`,
    url: `${base}/l/${branch.slug}`,
    branchOf: { '@type': 'Organization', name: storeName(storeConfig), url: base },
    ...(storefrontConfig?.logoUrl && { logo: storefrontConfig.logoUrl }),
    // The branch's own number when it has one; the shop's only as a fallback.
    ...((branch.phone || storeConfig.supportPhone) && {
      telephone: branch.phone || storeConfig.supportPhone,
    }),
    ...(storeConfig.supportEmail && { email: storeConfig.supportEmail }),
    ...(openingHours.length > 0 && { openingHoursSpecification: openingHours }),
    ...((branch.address || branch.city) && {
      address: {
        '@type': 'PostalAddress',
        ...(branch.address && { streetAddress: branch.address }),
        ...(branch.city && { addressLocality: branch.city }),
      },
    }),
    ...(branch.serviceArea.length > 0 && {
      areaServed: branch.serviceArea.map((city) => ({ '@type': 'City', name: city })),
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
      name: storeName(storeConfig),
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
      name: storeName(storeConfig),
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
