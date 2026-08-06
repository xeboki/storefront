/**
 * POST /api/checkout/cod
 *
 * Places an order with Cash on Delivery payment.
 * No payment gateway involved — order status is set to pending_payment.
 * Body: { storeSlug, items, customerId?, guestName?, guestEmail?, deliveryType, notes? }
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { loadStore } from '@/lib/sdk/store';
import { getXebokiClient } from '@/lib/sdk/client';

const LineItemSchema = z.object({
  productId: z.string(),
  variantId: z.string().optional(),
  quantity: z.number().int().positive(),
  modifiers: z.array(z.object({ modifierId: z.string() })).optional(),
  notes: z.string().optional(),
});

const Body = z.object({
  storeSlug: z.string(),
  items: z.array(LineItemSchema).min(1),
  customerId: z.string().optional(),
  guestName: z.string().optional(),
  guestEmail: z.string().email().optional(),
  deliveryType: z.enum(['pickup', 'delivery', 'dineIn']).default('pickup'),
  notes: z.string().optional(),
  // A dine-in order without its table cannot be delivered to anyone.
  tableId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const resolved = await loadStore(body.storeSlug);
  if (!resolved) {
    return NextResponse.json({ error: 'Store not found' }, { status: 404 });
  }

  const client = getXebokiClient(resolved.apiKey);

  // Step 1: Create the order (pending status)
  let order: { id: string; status: string; total: number };
  try {
    order = await client.ordering.createOrder({
      orderType: body.deliveryType,
      items: body.items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        modifiers: item.modifiers,
        notes: item.notes,
      })),
      customerId: body.customerId,
      guestName: body.guestName,
      guestEmail: body.guestEmail,
      notes: body.notes,
      tableId: body.tableId,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to place order';
    return NextResponse.json({ error: msg }, { status: 422 });
  }

  // Step 2: Mark as COD payment — same pattern the POS uses for cash/manual payments.
  // This moves the order to pending_payment status so the merchant knows to collect on delivery.
  try {
    const paid = await client.ordering.payOrder(order.id, {
      method: 'cod',
      amount: order.total,
    });
    return NextResponse.json({ orderId: paid.id, status: paid.status });
  } catch (err: unknown) {
    // Order is created — return it even if payOrder fails so we don't lose the order
    return NextResponse.json({ orderId: order.id, status: order.status });
  }
}
