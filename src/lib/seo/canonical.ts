/**
 * The one address a shop is indexed under.
 *
 * A shop can be reached several ways — its custom domain, its
 * `*.xeboki.store` subdomain, and a path prefix in development — and a
 * search engine that finds the same page at two addresses treats them as
 * two pages, splitting whatever either had earned. The catalogue makes it
 * worse: `?category=`, `?page=` and `?sort=` all serve the same products
 * under a different URL, and the sitemap lists several of them.
 *
 * **Nothing emitted a canonical link.** This is where the answer lives, in
 * one place, because the sitemap, `robots.txt` and every page's metadata
 * each need it and each had its own copy of the "custom domain else
 * subdomain" rule — or, in the pages' case, no copy at all.
 */
import type { StorefrontConfig } from '@xeboki/sdk';

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? 'xeboki.store';

/**
 * `https://shop.example` or `https://slug.xeboki.store` — never the
 * request's own host.
 *
 * Deliberately not the host the request arrived on: a shop reachable at
 * both its domain and its subdomain would then canonicalise to whichever
 * one the crawler happened to use, which is the thing a canonical exists
 * to stop.
 */
export function shopOrigin(
  storeSlug: string,
  config: StorefrontConfig | null | undefined,
): string {
  // Trailing slashes stripped whichever form the merchant typed. The
  // first version only stripped them on the `https://…` branch, so a
  // domain entered as `shop.example/` produced `https://shop.example//p/x`
  // — a different URL from the one the sitemap lists.
  const custom = (config?.customDomain ?? '').trim().replace(/\/+$/, '');
  if (custom) {
    return custom.startsWith('http') ? custom : `https://${custom}`;
  }
  return `https://${storeSlug}.${BASE_DOMAIN}`;
}

/**
 * The canonical URL of one page.
 *
 * `path` is the address *within the shop* — `/catalog`, `/p/returns`, or
 * `''` for the home page.
 *
 * **A query string here is kept**, because the caller chose to put it
 * there. The catalogue passes `?category=…` and nothing else: a category
 * listing is a page worth indexing on its own — "olive oil" is a real
 * search, and the sitemap lists one per category — while paging, sorting
 * and the in-stock filter are the same listing rearranged and never reach
 * this function. Stripping it here instead would tell a crawler to index
 * those sitemap entries and then that none of them are real.
 *
 * A fragment is always dropped: nothing is indexed by its anchor.
 */
export function canonicalUrl(
  storeSlug: string,
  config: StorefrontConfig | null | undefined,
  path = '',
): string {
  const base = shopOrigin(storeSlug, config);
  const clean = path.split('#')[0];
  if (!clean || clean === '/') return `${base}/`;
  return `${base}${clean.startsWith('/') ? clean : `/${clean}`}`;
}
