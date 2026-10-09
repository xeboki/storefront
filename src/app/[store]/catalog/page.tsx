import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import type { Metadata } from 'next'
import { canonicalUrl } from '@/lib/seo/canonical'
import { loadStore, loadCatalog, loadCategories } from '@/lib/sdk/store'
import { activeLocation, isLocationFirst, onlineStores, storeLabel } from '@/lib/location'
import { InStockFilter } from '@/components/product/InStockFilter'
import { CatalogSort } from '@/components/product/CatalogSort'
import { CatalogFilterSheet } from '@/components/product/CatalogFilterSheet'
import { ProductGrid } from '@/components/product/ProductGrid'
import { EmptyStoreNotice } from '@/components/product/EmptyStoreNotice'
import { storeName } from '@/lib/store-name'
import { sectionWords } from '@/lib/section-copy'
import { catalogueWords } from '@/lib/business-type'

interface Props {
  params: { store: string }
  searchParams: { category?: string; q?: string; page?: string; instock?: string; sort?: string; loc?: string }
}

/// Where the page size comes from when a shop has not chosen one.
///
/// It was a constant here, so every Xeboki shop on the internet showed
/// twenty-four products a page whatever it sold — a jeweller with nine
/// pieces and a wholesaler with nine hundred got the same listing.
const DEFAULT_PER_PAGE = 24

export async function generateMetadata(
  { params, searchParams }: Props,
): Promise<Metadata> {
  const store = await loadStore(params.store)

  // **Just "Shop".** The shop's name is already in the title template, so
  // `Shop — Game Bench` came out as `Shop — Game Bench | Game Bench` —
  // the name twice in a result that has about sixty characters to work
  // with. A page title is the page, not the page and the shop.
  //
  // A category listing says which category, because that is the thing
  // somebody searched for.
  const category = searchParams.category
    ? (await loadCategories(store?.apiKey ?? '').catch(() => ({ data: [] })))
        .data.find((c) => c.id === searchParams.category)
    : undefined

  // **The category stays in the canonical; everything else goes.**
  //
  // A category listing is a page worth indexing on its own — "olive oil"
  // is a real search — and the sitemap lists one per category, so
  // canonicalising them all back to `/catalog` would tell a crawler to
  // index pages and then that none of them are real. Paging, sorting and
  // the in-stock filter are the same listing rearranged, so they drop.
  const canonicalPath = searchParams.category
    ? `/catalog?category=${encodeURIComponent(searchParams.category)}`
    : '/catalog'

  return {
    title: category?.name ?? 'Shop',
    alternates: {
      canonical: canonicalUrl(params.store, store?.storefrontConfig,
                              canonicalPath),
    },
  }
}

function pageHref(base: string, sp: URLSearchParams, page: number): string {
  const p = new URLSearchParams(sp.toString())
  if (page <= 1) p.delete('page')
  else p.set('page', String(page))
  const qs = p.toString()
  return qs ? `${base}?${qs}` : base
}

export default async function CatalogPage({ params, searchParams }: Props) {
  const store = await loadStore(params.store)
  if (!store) notFound()

  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1)
  const inStockOnly = searchParams.instock === '1'
  const search = searchParams.q?.trim() || undefined
  // The shopper's choice first, then the shop's own default. A merchant who
  // sells seasonal stock wants newest first and had no way to say so: the
  // listing always opened in whatever order the API returned.
  const chosenSort = searchParams.sort
    || store.storefrontConfig?.catalogDefaultSort
    || undefined
  const sort = chosenSort as
    'name_asc'|'name_desc'|'price_asc'|'price_desc'|'newest'|undefined

  // Which store the shopper is shopping at — one answer, shared with the
  // product page, the cart and checkout. `?loc=` is remembered by the
  // middleware, so it survives past this page.
  const locationFirst = isLocationFirst(store.storefrontConfig)
  const stores = onlineStores(store.storefrontConfig)
  const activeStore = activeLocation(store.storefrontConfig, searchParams.loc)
  const activeLoc = activeStore?.locationId

  // 'location_first' means a shopper picks a store and sees what that store can
  // actually sell them. Passing the location alone only scopes the stock FIGURE
  // — every product still came back, so a branch holding nothing listed the
  // whole 158-product catalogue and none of it was fulfillable there.
  // A shop can choose not to list what it cannot sell. The switch has been on
  // the Overview tab since it shipped and read by nothing, so "hide
  // out-of-stock products" listed them anyway.
  const hideSoldOut = store.storefrontConfig?.showOutOfStock === false
  // Clamped by the API too; the fallback is here for a storefront talking to
  // an older one that does not serve it.
  const perPage = store.storefrontConfig?.catalogPerPage || DEFAULT_PER_PAGE
  const scopedToStock = locationFirst || inStockOnly || hideSoldOut

  // Search / category / paging all happen SERVER-SIDE against the API, so the
  // catalog is no longer capped at a client-loaded slice.
  const [catalogResult, categoriesResult] = await Promise.allSettled([
    loadCatalog(store.apiKey, {
      categoryId: searchParams.category,
      search,
      inStockOnly: scopedToStock,
      sort,
      locationId: activeLoc,
      page,
      perPage,
    }),
    loadCategories(store.apiKey),
  ])

  const products = catalogResult.status === 'fulfilled' ? (catalogResult.value.data ?? []) : []
  const total = catalogResult.status === 'fulfilled' ? (catalogResult.value.total ?? products.length) : products.length
  const categories = categoriesResult.status === 'fulfilled' ? (categoriesResult.value.data ?? []) : []
  const totalPages = Math.max(1, Math.ceil(total / perPage))

  const base = `/${params.store}/catalog`
  const sp = new URLSearchParams()
  if (searchParams.category) sp.set('category', searchParams.category)
  if (search) sp.set('q', search)
  if (inStockOnly) sp.set('instock', '1')
  // Only a sort the SHOPPER asked for. The shop's own default is how the
  // page looks with no sort on it, so putting it in the links here would
  // give every page of the listing a query string it does not need — and
  // make the plain `/catalog` URL a different page from its own first page.
  if (searchParams.sort) sp.set('sort', searchParams.sort)
  if (locationFirst && activeLoc) sp.set('loc', activeLoc)

  // The unfiltered listing is the one page a merchant might want to call
  // something else — 'The whole cellar', 'Every service'. A category listing
  // is named by the category and a search by what was typed, so neither takes
  // an override: replacing those with fixed words would make them wrong.
  // The defaults follow the trade: "12 products" on a menu reads as though
  // the kitchen sells twelve products. The merchant's override still wins.
  const words = catalogueWords(store.storeConfig.businessType)
  const masthead = sectionWords(store.storefrontConfig, 'catalog', {
    eyebrow: words.eyebrow,
    title: words.title,
  })
  const categoryName = searchParams.category
    ? categories.find((c) => c.id === searchParams.category)?.name ?? 'Products'
    : masthead.title

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 sm:pb-24 lg:px-8 lg:pt-14">
      {/* A listing still deserves a proper masthead: what you are looking at,
          and how much of it. The count used to float as a grey line under the
          controls, where it read as debug output. */}
      <header className="mb-10">
        <p className="eyebrow eyebrow-rule text-primary">
          {search ? 'Search' : searchParams.category ? 'Category' : masthead.eyebrow}
        </p>
        <h1 className="display-lg mt-3 text-fg">
          {search ? `“${search}”` : categoryName}
        </h1>
        <p className="mt-3 text-sm text-fg-muted">
          {total} {total === 1 ? words.one : words.many}
          {totalPages > 1 && ` · page ${page} of ${totalPages}`}
        </p>
      </header>

      {/* The store switcher lives in the header, on every page. It used to be
          repeated here as a chip row, which said the same thing twice and cost
          a phone most of its first screen. */}

      <CatalogFilterSheet
        categories={categories}
        activeCategoryId={searchParams.category}
        sort={sort ?? ''}
        inStock={inStockOnly}
        lockInStock={locationFirst}
        total={total}
      />

      {/* Categories live in the header rail now, on every page. Rendering them
          again here showed the same list twice on one screen. */}
      {/* Search is in the header on every page now; only availability and
          sort belong to the listing itself. */}
      <div className="mb-8 hidden items-center justify-between gap-3 border-y border-line py-3 sm:flex">
        <InStockFilter checked={scopedToStock} locked={locationFirst} />
        <CatalogSort current={sort ?? ''} />
      </div>

      {products.length === 0 && locationFirst && !search && !searchParams.category ? (
        <EmptyStoreNotice
          storeName={storeLabel(activeStore)}
          others={stores.filter((s) => s.locationId !== activeLoc)}
          base={base}
        />
      ) : (
        <ProductGrid products={products} storeSlug={params.store} />
      )}

      {totalPages > 1 && (
        <nav
          className="mt-16 flex items-center justify-between gap-4 border-t border-line pt-8"
          aria-label="Pagination"
        >
          {page > 1 ? (
            <Link
              href={pageHref(base, sp, page - 1)}
              scroll
              className="group inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-fg transition-colors hover:text-primary"
            >
              <ArrowLeft size={15} className="motion-safe:transition-transform motion-safe:group-hover:-translate-x-1" />
              Previous
            </Link>
          ) : (
            /* Holds the column so the page number stays centred on page one. */
            <span aria-hidden />
          )}

          <span className="price text-xs uppercase tracking-[0.12em] text-fg-muted">
            {String(page).padStart(2, '0')} / {String(totalPages).padStart(2, '0')}
          </span>

          {page < totalPages ? (
            <Link
              href={pageHref(base, sp, page + 1)}
              scroll
              className="group inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-fg transition-colors hover:text-primary"
            >
              Next
              <ArrowRight size={15} className="motion-safe:transition-transform motion-safe:group-hover:translate-x-1" />
            </Link>
          ) : (
            <span aria-hidden />
          )}
        </nav>
      )}
    </div>
  )
}
