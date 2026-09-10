import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireMobile, isResponse } from '@/lib/mobile/context';

export async function GET(req: NextRequest, { params }: { params: { orderId: string } }) {
  const ctx = await requireMobile(req);
  if (isResponse(ctx)) return ctx;
  try {
    return NextResponse.json({ returns: await ctx.client.ordering.listReturns(params.orderId) });
  } catch {
    return NextResponse.json({ returns: [] });
  }
}

const Body = z.object({ reason: z.string().min(1), notes: z.string().optional() });

export async function POST(req: NextRequest, { params }: { params: { orderId: string } }) {
  const ctx = await requireMobile(req);
  if (isResponse(ctx)) return ctx;
  let body: z.infer<typeof Body>;
  try { body = Body.parse(await req.json()); }
  catch { return NextResponse.json({ error: 'A reason is required.' }, { status: 400 }); }
  // Ownership check before creating the return.
  try {
    const order = await ctx.client.ordering.getOrder(params.orderId);
    if (order.customerId && order.customerId !== ctx.session.customerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const ret = await ctx.client.ordering.requestReturn(params.orderId, { reason: body.reason, notes: body.notes });
    return NextResponse.json(ret, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Could not submit the return.';
    return NextResponse.json({ error: msg }, { status: 422 });
  }
}
