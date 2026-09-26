/**
 * GET /api/suggest — what the header's search box offers as you type.
 *
 * The box submitted to the catalog and nothing else, so finding one product
 * meant typing, pressing enter, waiting for a page, and reading a grid. For a
 * shop with a thousand lines that is the difference between finding something
 * and giving up.
 *
 * Server-side, like every route here, because the store's API key must not
 * reach the browser. The search itself is the one the catalog already runs —
 * this asks for the first few rows of it rather than a page.
 */
import { NextRequest, NextResponse } from 'next/server';
import { loadStore, loadCatalog, loadCategories } from '@/lib/sdk/store';
import { activeLocation, isLocationFirst } from '@/lib/location';
import { productIsSellable } from '@/lib/availability';

/** Enough to choose from, few enough to read without scrolling. */
const LIMIT = 6;

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const storeSlug = params.get('storeSlug');
  const term = (params.get('q') ?? '').trim();

  if (!storeSlug) {
    return NextResponse.json({ error: 'storeSlug is required' }, { status: 400 });
  }
  // One letter matches most of a catalogue, which is not a suggestion.
  if (term.length < 2) return NextResponse.json({ products: [], categories: [] });

  const resolved = await loadStore(storeSlug);
  if (!resolved) return NextResponse.json({ error: 'Unknown store' }, { status: 404 });

  const { apiKey, storefrontConfig } = resolved;

  // A shop browsing one branch at a time is scoped to that branch, so prices
  // and stock are the ones it actually holds.
  //
  // Deliberately NOT in-stock-only: the catalog lists a sold-out product with
  // a badge rather than hiding it, and suggestions that disagree with the page
  // they lead to are worse than none. Searching "jeans" in a shop that has
  // jeans must find the jeans and say they are gone.
  const locationFirst = isLocationFirst(storefrontConfig);
  const branch = activeLocation(storefrontConfig, params.get('loc'));

  const [catalog, categories] = await Promise.all([
    loadCatalog(apiKey, {
      search: term,
      perPage: LIMIT,
      locationId: locationFirst ? branch?.locationId : undefined,
    }).catch(() => null),
    loadCategories(apiKey).catch(() => null),
  ]);

  const needle = term.toLowerCase();
  return NextResponse.json({
    products: (catalog?.data ?? []).filter((p) => p.isActive).slice(0, LIMIT).map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      imageUrl: p.imageUrl ?? null,
      categoryName: p.categoryName ?? null,
      soldOut: !productIsSellable(p),
    })),
    // A department is often what somebody typing "repairs" actually wants.
    categories: (categories?.data ?? [])
      .filter((c) => c.id !== '_uncategorized' && c.name.toLowerCase().includes(needle))
      .slice(0, 3)
      .map((c) => ({ id: c.id, name: c.name })),
    total: catalog?.total ?? 0,
  });
}
