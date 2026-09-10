import { NextRequest, NextResponse } from 'next/server';
import { requireMobile, isResponse } from '@/lib/mobile/context';
export async function GET(req: NextRequest) {
  const ctx = await requireMobile(req); if (isResponse(ctx)) return ctx;
  const code = req.nextUrl.searchParams.get('code') ?? undefined;
  try { return NextResponse.json({ discounts: await ctx.client.ordering.listDiscounts({ code }) }); }
  catch { return NextResponse.json({ discounts: [] }); }
}
