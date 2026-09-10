import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireMobile, isResponse } from '@/lib/mobile/context';

const Body = z.object({ method: z.string().min(1), amount: z.number(), reference: z.string().optional() });

export async function POST(req: NextRequest, { params }: { params: { orderId: string } }) {
  const ctx = await requireMobile(req);
  if (isResponse(ctx)) return ctx;
  let body: z.infer<typeof Body>;
  try { body = Body.parse(await req.json()); }
  catch { return NextResponse.json({ error: 'method and amount required' }, { status: 400 }); }
  try {
    const order = await ctx.client.ordering.getOrder(params.orderId);
    if (order.customerId && order.customerId !== ctx.session.customerId)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const paid = await ctx.client.ordering.payOrder(params.orderId, {
      method: body.method, amount: body.amount, reference: body.reference,
    });
    return NextResponse.json(paid);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Payment failed';
    return NextResponse.json({ error: msg }, { status: 422 });
  }
}
