import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { loadStore, loadCatalog, loadCategories } from '@/lib/sdk/store'
import { CategoryFilterBar } from '@/components/product/CategoryFilterBar'
import { CatalogSearch } from '@/components/product/CatalogSearch'
import { CatalogSort } from '@/components/product/CatalogSort'
import { ProductGrid } from '@/components/product/ProductGrid'

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

  // Catalog browsing model (merchant-configured). In 'location_first', the buyer
  // browses one store's catalog — scope stock + availability to that location.
  const catalogMode = store.storefrontConfig?.catalogMode ?? 'unified'
  const onlineStores = (store.storefrontConfig?.fulfillmentLocations ?? [])
    .filter((l) => l.deliveryEnabled || l.pickupEnabled)
  const locationFirst = catalogMode === 'location_first' && onlineStores.length > 0
  const activeLoc = locationFirst
    ? (onlineStores.find((s) => s.locationId === searchParams.loc)?.locationId
       ?? onlineStores[0].locationId)
    : undefined

  // Search / category / paging all happen SERVER-SIDE against the API, so the
  // catalog is no longer capped at a client-loaded slice.
  const [catalogResult, categoriesResult] = await Promise.allSettled([
    loadCatalog(store.apiKey, {
      categoryId: searchParams.category,
      search,
      inStockOnly,
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {search ? `Results for “${search}”` : categoryName}
      </h1>

      {/* Location-first: pick a store; the catalog shows its own stock. */}
      {locationFirst && (
        <div className="mb-5 rounded-brand border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-medium text-slate-500 mb-2">Shopping at</p>
          <div className="flex flex-wrap gap-2">
            {onlineStores.map((s) => {
              const params2 = new URLSearchParams()
              params2.set('loc', s.locationId)
              if (searchParams.category) params2.set('category', searchParams.category)
              const active = s.locationId === activeLoc
              return (
                <Link
                  key={s.locationId}
                  href={`${base}?${params2.toString()}`}
                  className={
                    'px-3 py-1.5 rounded-full text-sm border transition-colors ' +
                    (active
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-primary')
                  }
                >
                  {s.locationName || s.city || 'Store'}
                </Link>
              )
            })}
          </div>
        </div>
      )}

      <CategoryFilterBar categories={categories} activeId={searchParams.category} storeSlug={params.store} />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex-1">
          <CatalogSearch initialQuery={search ?? ''} initialInStock={inStockOnly} />
        </div>
        <CatalogSort current={sort ?? ''} />
      </div>

      <p className="text-sm text-slate-500 mb-4">
        {total} {total === 1 ? 'product' : 'products'}
        {totalPages > 1 && ` · page ${page} of ${totalPages}`}
      </p>

      <ProductGrid products={products} storeSlug={params.store} />

      {totalPages > 1 && (
        <nav className="flex items-center justify-center gap-2 mt-10" aria-label="Pagination">
          {page > 1 && (
            <Link href={pageHref(base, sp, page - 1)} scroll className="px-4 py-2 rounded-brand border border-slate-200 text-sm hover:border-primary hover:text-primary">
              ← Previous
            </Link>
          )}
          <span className="px-3 py-2 text-sm text-slate-500">Page {page} of {totalPages}</span>
          {page < totalPages && (
            <Link href={pageHref(base, sp, page + 1)} scroll className="px-4 py-2 rounded-brand border border-slate-200 text-sm hover:border-primary hover:text-primary">
              Next →
            </Link>
          )}
        </nav>
      )}
    </div>
  )
}
