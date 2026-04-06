import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { loadStore, loadCatalog, loadCategories } from '@/lib/sdk/store'
import { CatalogClientWrapper } from '@/components/product/CatalogClientWrapper'

interface Props {
  params: { store: string }
  searchParams: { category?: string; q?: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const store = await loadStore(params.store)
  return {
    title: store ? `Shop — ${store.storeConfig.name}` : 'Shop',
  }
}

export default async function CatalogPage({ params, searchParams }: Props) {
  const store = await loadStore(params.store)
  if (!store) notFound()

  const { apiKey } = store

  // Load ALL products once (ISR-cached, 60s).
  // Client wrapper handles filtering / sorting without extra network requests.
  const [catalogResult, categoriesResult] = await Promise.allSettled([
    loadCatalog(apiKey),
    loadCategories(apiKey),
  ])

  const allProducts = catalogResult.status === 'fulfilled' ? (catalogResult.value.data ?? []) : []
  const categories  = categoriesResult.status === 'fulfilled' ? (categoriesResult.value.data ?? []) : []

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {searchParams.category
            ? (categories.find(c => c.id === searchParams.category)?.name ?? 'Products')
            : 'All Products'}
        </h1>
      </div>

      {/*
        CatalogClientWrapper owns all interactive state:
        search | sort | price range | in-stock toggle | active pills
        Receives the full product list from the server — no client-side network calls.
      */}
      <CatalogClientWrapper
        products={allProducts}
        categories={categories}
        storeSlug={params.store}
        initialCategoryId={searchParams.category}
        initialQuery={searchParams.q ?? ''}
      />
    </div>
  )
}
