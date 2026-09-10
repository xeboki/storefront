import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireMobile, isResponse } from '@/lib/mobile/context';

const Body = z.object({ paymentIntentId: z.string().min(1) });

export async function POST(req: NextRequest, { params }: { params: { orderId: string } }) {
  const ctx = await requireMobile(req);
  if (isResponse(ctx)) return ctx;
  let body: z.infer<typeof Body>;
  try { body = Body.parse(await req.json()); }
  catch { return NextResponse.json({ error: 'paymentIntentId required' }, { status: 400 }); }
  try {
    const order = await ctx.client.ordering.getOrder(params.orderId);
    if (order.customerId && order.customerId !== ctx.session.customerId)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const result = await ctx.client.ordering.confirmStripePayment(params.orderId, body.paymentIntentId);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to confirm payment';
    return NextResponse.json({ error: msg }, { status: 422 });
  }
}
