import { NextRequest, NextResponse } from 'next/server';
import { requireMobile, isResponse } from '@/lib/mobile/context';
export async function GET(req: NextRequest, { params }: { params: { orderId: string } }) {
  const ctx = await requireMobile(req); if (isResponse(ctx)) return ctx;
  // Ownership check before exposing tracking.
  try {
    const order = await ctx.client.ordering.getOrder(params.orderId);
    if (order.customerId && order.customerId !== ctx.session.customerId)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json(await ctx.client.ordering.getDeliveryTracking(params.orderId));
  } catch { return NextResponse.json({ error: 'Not found' }, { status: 404 }); }
}
