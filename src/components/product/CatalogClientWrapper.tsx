'use client'
/**
 * CatalogClientWrapper — Advanced Search, Filters & Sorting.
 *
 * Receives all products from the server (ISR) and handles:
 *   - Debounced text search (name, description, tags, SKU)
 *   - Category filter (URL-synced chips)
 *   - Sort (featured | price-asc | price-desc | name-asc | name-desc | newest)
 *   - Price range slider (dynamic min/max from catalog)
 *   - In-stock only toggle
 *   - Active filter pills with individual remove + "Clear all"
 *   - Result count
 *   - No-results state with suggestions
 */
import { useState, useMemo, useCallback, useTransition } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import type { OrderingProduct, OrderingCategory } from '@xeboki/sdk'
import { ProductGrid } from './ProductGrid'

// ── Types ─────────────────────────────────────────────────────────────────────

type SortKey = 'featured' | 'price-asc' | 'price-desc' | 'name-asc' | 'name-desc' | 'newest'

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'featured',   label: 'Featured' },
  { value: 'name-asc',   label: 'Name: A → Z' },
  { value: 'name-desc',  label: 'Name: Z → A' },
  { value: 'price-asc',  label: 'Price: Low → High' },
  { value: 'price-desc', label: 'Price: High → Low' },
  { value: 'newest',     label: 'Newest First' },
]

interface Props {
  products: OrderingProduct[]
  categories: OrderingCategory[]
  storeSlug: string
  initialCategoryId?: string
  initialQuery?: string
}

// ── Main component ────────────────────────────────────────────────────────────

export function CatalogClientWrapper({
  products,
  categories,
  storeSlug,
  initialCategoryId,
  initialQuery = '',
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  // Filter state
  const [query, setQuery] = useState(initialQuery)
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery)
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null)
  const [selectedCategory, setSelectedCategory] = useState(initialCategoryId ?? '')
  const [sort, setSort] = useState<SortKey>('featured')
  const [inStockOnly, setInStockOnly] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  // Price range — derived from catalog
  const prices = products.map(p => p.price ?? 0).filter(Boolean)
  const catalogMin = prices.length ? Math.floor(Math.min(...prices)) : 0
  const catalogMax = prices.length ? Math.ceil(Math.max(...prices)) : 1000
  const [priceMin, setPriceMin] = useState(catalogMin)
  const [priceMax, setPriceMax] = useState(catalogMax)
  const isPriceFiltered = priceMin > catalogMin || priceMax < catalogMax

  // ── Debounce search input ─────────────────────────────────────────────────
  function handleSearchChange(value: string) {
    setQuery(value)
    if (debounceTimer) clearTimeout(debounceTimer)
    const timer = setTimeout(() => setDebouncedQuery(value), 250)
    setDebounceTimer(timer)
  }

  // ── Category selection (URL-synced) ───────────────────────────────────────
  function handleCategorySelect(catId: string) {
    setSelectedCategory(catId)
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (catId) {
        params.set('category', catId)
      } else {
        params.delete('category')
      }
      router.push(`${pathname}?${params.toString()}`, { scroll: false })
    })
  }

  // ── Filtered + sorted products ────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = [...products]

    // Text search — name, description, sku, tags
    if (debouncedQuery.trim()) {
      const q = debouncedQuery.toLowerCase()
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        (p as unknown as Record<string, unknown>).sku?.toString().toLowerCase().includes(q) ||
        ((p as unknown as Record<string, unknown>).tags as string[] | undefined)?.some(t => t.toLowerCase().includes(q))
      )
    }

    // Category
    if (selectedCategory) {
      result = result.filter(p => (p as unknown as Record<string, unknown>).categoryId === selectedCategory)
    }

    // Price range
    if (isPriceFiltered) {
      result = result.filter(p => {
        const price = p.price ?? 0
        return price >= priceMin && price <= priceMax
      })
    }

    // In-stock only
    if (inStockOnly) {
      result = result.filter(p => {
        const stock = (p as unknown as Record<string, unknown>).stock as number | undefined
        return !p.hasVariants ? (stock == null || stock > 0) : true
      })
    }

    // Sort
    switch (sort) {
      case 'price-asc':
        result.sort((a, b) => (a.price ?? 0) - (b.price ?? 0))
        break
      case 'price-desc':
        result.sort((a, b) => (b.price ?? 0) - (a.price ?? 0))
        break
      case 'name-asc':
        result.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'name-desc':
        result.sort((a, b) => b.name.localeCompare(a.name))
        break
      case 'newest':
        result.sort((a, b) => {
          const aDate = (a as unknown as Record<string, unknown>).createdAt as string | undefined
          const bDate = (b as unknown as Record<string, unknown>).createdAt as string | undefined
          return (bDate ?? '').localeCompare(aDate ?? '')
        })
        break
      // 'featured' — keep server order
    }

    return result
  }, [products, debouncedQuery, selectedCategory, sort, inStockOnly, priceMin, priceMax, isPriceFiltered])

  // ── Active filter pills ───────────────────────────────────────────────────
  const activeFilters: { label: string; onRemove: () => void }[] = []

  if (debouncedQuery) {
    activeFilters.push({ label: `"${debouncedQuery}"`, onRemove: () => { setQuery(''); setDebouncedQuery('') } })
  }
  if (selectedCategory) {
    const cat = categories.find(c => c.id === selectedCategory)
    if (cat) activeFilters.push({ label: cat.name, onRemove: () => handleCategorySelect('') })
  }
  if (isPriceFiltered) {
    activeFilters.push({
      label: `$${priceMin} – $${priceMax}`,
      onRemove: () => { setPriceMin(catalogMin); setPriceMax(catalogMax) },
    })
  }
  if (inStockOnly) {
    activeFilters.push({ label: 'In stock', onRemove: () => setInStockOnly(false) })
  }
  if (sort !== 'featured') {
    const label = SORT_OPTIONS.find(s => s.value === sort)?.label ?? sort
    activeFilters.push({ label, onRemove: () => setSort('featured') })
  }

  function clearAllFilters() {
    setQuery(''); setDebouncedQuery('')
    handleCategorySelect('')
    setPriceMin(catalogMin); setPriceMax(catalogMax)
    setInStockOnly(false)
    setSort('featured')
  }

  const visibleCategories = categories.filter(c => c.id !== '_uncategorized')

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* ── Top toolbar ── */}
      <div className="flex flex-col gap-3 mb-6">
        {/* Row 1: Search + Sort + Filter toggle */}
        <div className="flex gap-3 items-center">
          {/* Search input */}
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="search"
              value={query}
              onChange={e => handleSearchChange(e.target.value)}
              placeholder="Search products…"
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
                         bg-white placeholder-gray-400"
            />
            {query && (
              <button
                onClick={() => { setQuery(''); setDebouncedQuery('') }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Sort */}
          <select
            value={sort}
            onChange={e => setSort(e.target.value as SortKey)}
            className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white
                       focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
          >
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Filters toggle */}
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors
              ${showFilters
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-gray-600 border-gray-200 hover:border-primary hover:text-primary'
              }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
            </svg>
            Filters
            {activeFilters.length > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold
                ${showFilters ? 'bg-white text-primary' : 'bg-primary text-white'}`}>
                {activeFilters.length}
              </span>
            )}
          </button>
        </div>

        {/* Row 2: Category chips */}
        {visibleCategories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <CategoryChip
              label="All"
              active={!selectedCategory}
              onClick={() => handleCategorySelect('')}
            />
            {visibleCategories.map(cat => (
              <CategoryChip
                key={cat.id}
                label={cat.name}
                active={selectedCategory === cat.id}
                onClick={() => handleCategorySelect(cat.id)}
              />
            ))}
          </div>
        )}

        {/* Row 3: Expanded filter panel */}
        {showFilters && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Price range */}
              {catalogMax > catalogMin && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                    Price Range
                  </label>
                  <PriceRangeSlider
                    min={catalogMin}
                    max={catalogMax}
                    valueMin={priceMin}
                    valueMax={priceMax}
                    onChange={(min, max) => { setPriceMin(min); setPriceMax(max) }}
                  />
                </div>
              )}

              {/* In-stock toggle */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                  Availability
                </label>
                <button
                  onClick={() => setInStockOnly(v => !v)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors
                    ${inStockOnly
                      ? 'bg-green-50 border-green-400 text-green-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                >
                  <span className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors
                    ${inStockOnly ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                    {inStockOnly && (
                      <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </span>
                  In stock only
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Row 4: Active filter pills */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-gray-500 font-medium">Active:</span>
            {activeFilters.map((f, i) => (
              <FilterPill key={i} label={f.label} onRemove={f.onRemove} />
            ))}
            <button
              onClick={clearAllFilters}
              className="text-xs text-primary hover:underline font-medium ml-1"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* ── Results header ── */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          {filtered.length === products.length
            ? `${filtered.length} products`
            : `${filtered.length} of ${products.length} products`}
          {isPending && <span className="ml-2 opacity-50">…</span>}
        </p>
      </div>

      {/* ── Products or empty state ── */}
      {filtered.length === 0 ? (
        <NoResultsState
          query={debouncedQuery}
          hasFilters={activeFilters.length > 0}
          onClear={clearAllFilters}
          suggestions={products.slice(0, 4)}
          storeSlug={storeSlug}
        />
      ) : (
        <ProductGrid products={filtered} storeSlug={storeSlug} />
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CategoryChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium border transition-colors
        ${active
          ? 'bg-primary text-white border-transparent'
          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:text-gray-800'
        }`}
      style={active ? { backgroundColor: 'var(--color-primary)' } : undefined}
    >
      {label}
    </button>
  )
}

function FilterPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10
                     text-primary text-xs font-medium border border-primary/20">
      {label}
      <button onClick={onRemove} className="ml-0.5 hover:text-primary/60 transition-colors">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </span>
  )
}

function PriceRangeSlider({
  min, max, valueMin, valueMax, onChange,
}: {
  min: number; max: number; valueMin: number; valueMax: number
  onChange: (min: number, max: number) => void
}) {
  // Two-thumb slider using two overlapping range inputs
  const range = max - min || 1
  const leftPct  = ((valueMin - min) / range) * 100
  const rightPct = ((valueMax - min) / range) * 100

  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>${valueMin}</span>
        <span>${valueMax}</span>
      </div>
      <div className="relative h-5 flex items-center">
        <div className="absolute left-0 right-0 h-1.5 bg-gray-200 rounded-full">
          <div
            className="absolute h-full rounded-full"
            style={{
              left: `${leftPct}%`,
              right: `${100 - rightPct}%`,
              backgroundColor: 'var(--color-primary)',
            }}
          />
        </div>
        {/* Min thumb */}
        <input
          type="range"
          min={min}
          max={max}
          value={valueMin}
          onChange={e => {
            const v = Number(e.target.value)
            if (v <= valueMax) onChange(v, valueMax)
          }}
          className="absolute w-full h-1.5 appearance-none bg-transparent cursor-pointer slider-thumb"
        />
        {/* Max thumb */}
        <input
          type="range"
          min={min}
          max={max}
          value={valueMax}
          onChange={e => {
            const v = Number(e.target.value)
            if (v >= valueMin) onChange(valueMin, v)
          }}
          className="absolute w-full h-1.5 appearance-none bg-transparent cursor-pointer slider-thumb"
        />
      </div>
    </div>
  )
}

function NoResultsState({
  query, hasFilters, onClear, suggestions, storeSlug,
}: {
  query: string; hasFilters: boolean; onClear: () => void
  suggestions: OrderingProduct[]; storeSlug: string
}) {
  return (
    <div className="text-center py-16">
      <div className="text-5xl mb-4">🔍</div>
      <h3 className="text-lg font-semibold text-gray-800 mb-2">
        {query ? `No results for "${query}"` : 'No products match your filters'}
      </h3>
      <p className="text-gray-500 text-sm mb-6">
        {hasFilters
          ? 'Try adjusting or removing some filters.'
          : 'Try a different search term.'}
      </p>
      {hasFilters && (
        <button
          onClick={onClear}
          className="px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          Clear all filters
        </button>
      )}
      {suggestions.length > 0 && (
        <div className="mt-10">
          <p className="text-sm text-gray-400 mb-4">You might like</p>
          <ProductGrid products={suggestions} storeSlug={storeSlug} />
        </div>
      )}
    </div>
  )
}
