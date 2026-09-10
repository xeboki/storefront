import { NextRequest, NextResponse } from 'next/server';
import { requireMobile, isResponse } from '@/lib/mobile/context';
export async function GET(req: NextRequest) {
  const ctx = await requireMobile(req); if (isResponse(ctx)) return ctx;
  const loc = req.nextUrl.searchParams.get('location') ?? undefined;
  try { return NextResponse.json(await ctx.client.ordering.getDeliveryZones({ locationId: loc })); }
  catch { return NextResponse.json({ zones: [] }); }
}
