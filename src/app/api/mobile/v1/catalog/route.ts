import { NextRequest, NextResponse } from 'next/server';
import { loadCatalog } from '@/lib/sdk/store';
import { requireMobile, isResponse } from '@/lib/mobile/context';

export async function GET(req: NextRequest) {
  const ctx = await requireMobile(req);
  if (isResponse(ctx)) return ctx;
  const p = req.nextUrl.searchParams;
  const sort = (p.get('sort') as 'name_asc'|'name_desc'|'price_asc'|'price_desc'|'newest'|null) ?? undefined;
  const res = await loadCatalog(ctx.store.apiKey, {
    categoryId: p.get('category') ?? undefined,
    search: p.get('q')?.trim() || undefined,
    inStockOnly: p.get('instock') === '1',
    sort,
    page: Math.max(1, parseInt(p.get('page') ?? '1', 10) || 1),
    perPage: Math.min(50, parseInt(p.get('per_page') ?? '24', 10) || 24),
  });
  return NextResponse.json(res ?? { data: [], total: 0 });
}
