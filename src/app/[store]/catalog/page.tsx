import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { loadStore, loadCatalog, loadCategories } from '@/lib/sdk/store'
import { activeLocation, isLocationFirst, onlineStores, storeLabel } from '@/lib/location'
import { CategoryFilterBar } from '@/components/product/CategoryFilterBar'
import { CatalogSearch } from '@/components/product/CatalogSearch'
import { CatalogSort } from '@/components/product/CatalogSort'
import { CatalogFilterSheet } from '@/components/product/CatalogFilterSheet'
import { ProductGrid } from '@/components/product/ProductGrid'
import { EmptyStoreNotice } from '@/components/product/EmptyStoreNotice'

interface Props {
  params: { store: string }
  searchParams: { category?: string; q?: string; page?: string; instock?: string; sort?: string; loc?: string }
}

const PER_PAGE = 24

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const store = await loadStore(params.store)
  return { title: store ? `Shop — ${store.storeConfig.businessName}` : 'Shop' }
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
  const sort = (searchParams.sort as 'name_asc'|'name_desc'|'price_asc'|'price_desc'|'newest'|undefined) || undefined

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
  const scopedToStock = locationFirst || inStockOnly

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
      perPage: PER_PAGE,
    }),
    loadCategories(store.apiKey),
  ])

  const products = catalogResult.status === 'fulfilled' ? (catalogResult.value.data ?? []) : []
  const total = catalogResult.status === 'fulfilled' ? (catalogResult.value.total ?? products.length) : products.length
  const categories = categoriesResult.status === 'fulfilled' ? (categoriesResult.value.data ?? []) : []
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))

  const base = `/${params.store}/catalog`
  const sp = new URLSearchParams()
  if (searchParams.category) sp.set('category', searchParams.category)
  if (search) sp.set('q', search)
  if (inStockOnly) sp.set('instock', '1')
  if (sort) sp.set('sort', sort)
  if (locationFirst && activeLoc) sp.set('loc', activeLoc)

  const categoryName = searchParams.category
    ? categories.find((c) => c.id === searchParams.category)?.name ?? 'Products'
    : 'All Products'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-fg mb-6">
        {search ? `Results for “${search}”` : categoryName}
      </h1>

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

      <CategoryFilterBar
        categories={categories}
        activeId={searchParams.category}
        storeSlug={params.store}
        className="hidden sm:flex"
      />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex-1">
          <CatalogSearch
            initialQuery={search ?? ''}
            initialInStock={scopedToStock}
            lockInStock={locationFirst}
          />
        </div>
        <CatalogSort current={sort ?? ''} className="hidden sm:flex" />
      </div>

      <p className="text-sm text-fg-muted mb-4">
        {total} {total === 1 ? 'product' : 'products'}
        {totalPages > 1 && ` · page ${page} of ${totalPages}`}
      </p>

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
        <nav className="flex items-center justify-center gap-2 mt-10" aria-label="Pagination">
          {page > 1 && (
            <Link href={pageHref(base, sp, page - 1)} scroll className="px-4 py-2 rounded-brand border border-line text-sm hover:border-primary hover:text-primary">
              ← Previous
            </Link>
          )}
          <span className="px-3 py-2 text-sm text-fg-muted">Page {page} of {totalPages}</span>
          {page < totalPages && (
            <Link href={pageHref(base, sp, page + 1)} scroll className="px-4 py-2 rounded-brand border border-line text-sm hover:border-primary hover:text-primary">
              Next →
            </Link>
          )}
        </nav>
      )}
    </div>
  )
}
