import { NextRequest, NextResponse } from 'next/server';
import { requireMobile, isResponse } from '@/lib/mobile/context';

/** Create a Stripe PaymentIntent for the customer's own order. */
export async function POST(req: NextRequest, { params }: { params: { orderId: string } }) {
  const ctx = await requireMobile(req);
  if (isResponse(ctx)) return ctx;
  try {
    const order = await ctx.client.ordering.getOrder(params.orderId);
    if (order.customerId && order.customerId !== ctx.session.customerId)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const intent = await ctx.client.ordering.createStripePaymentIntent(params.orderId);
    return NextResponse.json(intent);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to start payment';
    return NextResponse.json({ error: msg }, { status: 422 });
  }
}
