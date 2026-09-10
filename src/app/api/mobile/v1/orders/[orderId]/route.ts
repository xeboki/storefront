import { NextRequest, NextResponse } from 'next/server';
import { requireMobile, isResponse } from '@/lib/mobile/context';

export async function GET(req: NextRequest, { params }: { params: { orderId: string } }) {
  const ctx = await requireMobile(req);
  if (isResponse(ctx)) return ctx;
  let order;
  try {
    order = await ctx.client.ordering.getOrder(params.orderId);
  } catch {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }
  if (order.customerId && order.customerId !== ctx.session.customerId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return NextResponse.json(order);
}
