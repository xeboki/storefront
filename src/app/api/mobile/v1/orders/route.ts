import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveOrderingLocationId } from '@/lib/sdk/store';
import { requireMobile, isResponse } from '@/lib/mobile/context';

const LineItem = z.object({
  productId: z.string(),
  variantId: z.string().optional(),
  quantity: z.number().int().positive(),
  modifiers: z.array(z.object({ modifierId: z.string() })).optional(),
  notes: z.string().optional(),
});
const Body = z.object({
  items: z.array(LineItem).min(1),
  orderType: z.enum(['pickup', 'delivery', 'dineIn']).default('pickup'),
  tableId: z.string().optional(),
  notes: z.string().optional(),
  discountCode: z.string().optional(),
  giftCardCode: z.string().optional(),
  shippingAmount: z.number().nonnegative().optional(),
  loyaltyPointsRedeemed: z.number().int().nonnegative().optional(),
});

function toOrderType(t: 'pickup' | 'delivery' | 'dineIn'): string {
  return t === 'dineIn' ? 'dine_in' : t;
}

export async function GET(req: NextRequest) {
  const ctx = await requireMobile(req);
  if (isResponse(ctx)) return ctx;
  // Only the signed-in customer's own orders.
  const res = await ctx.client.ordering.listOrders({ customerId: ctx.session.customerId, limit: 25 });
  return NextResponse.json({ orders: res.data });
}

export async function POST(req: NextRequest) {
  const ctx = await requireMobile(req);
  if (isResponse(ctx)) return ctx;
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid order' }, { status: 400 });
  }
  const locationId = (await resolveOrderingLocationId(ctx.store.apiKey)) ?? undefined;
  try {
    const order = await ctx.client.ordering.createOrder({
      locationId,
      orderType: toOrderType(body.orderType),
      items: body.items,
      customerId: ctx.session.customerId, // bound to the authenticated customer
      tableId: body.tableId,
      notes: body.notes,
      discountCode: body.discountCode,
      giftCardCode: body.giftCardCode,
      shippingAmount: body.shippingAmount,
      loyaltyPointsRedeemed: body.loyaltyPointsRedeemed,
    });
    return NextResponse.json(order, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to place order';
    return NextResponse.json({ error: msg }, { status: 422 });
  }
}
