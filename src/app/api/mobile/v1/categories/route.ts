import { NextRequest, NextResponse } from 'next/server';
import { loadCategories } from '@/lib/sdk/store';
import { requireMobile, isResponse } from '@/lib/mobile/context';

export async function GET(req: NextRequest) {
  const ctx = await requireMobile(req);
  if (isResponse(ctx)) return ctx;
  const res = await loadCategories(ctx.store.apiKey);
  return NextResponse.json(res ?? { data: [] });
}
