/**
 * POST /api/checkout/automatic-discount
 *
 * What this basket gets without the shopper typing anything.
 *
 * A shop can run "10% off everything this week" or "free delivery over
 * fifty" with no code at all. Until this existed nothing looked for one, so a
 * merchant could create the offer and no shopper would ever receive it.
 *
 * Advisory. The order endpoint resolves the same rule again before it charges
 * anybody, because a saving a client asserts is a saving anybody can assert.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { loadStore } from '@/lib/sdk/store';
import { getXebokiClient } from '@/lib/sdk/client';

const Body = z.object({
  storeSlug: z.string(),
  orderTotal: z.number().optional(),
  quantity: z.number().optional(),
  shippingAmount: z.number().optional(),
});

export async function POST(req: NextRequest) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const resolved = await loadStore(body.storeSlug);
  if (!resolved) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

  try {
    const client = getXebokiClient(resolved.apiKey);
    const result = await client.ordering.automaticDiscount({
      orderTotal: body.orderTotal,
      quantity: body.quantity,
      shippingAmount: body.shippingAmount,
    });
    return NextResponse.json(result);
  } catch {
    // An offer that cannot be looked up must not stop a checkout. The shopper
    // pays the ordinary price, which is the price they were shown.
    return NextResponse.json({ applies: false });
  }
}
