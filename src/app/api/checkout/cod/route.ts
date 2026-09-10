/**
 * POST /api/checkout/cod
 *
 * Places an order with Cash on Delivery payment.
 * No payment gateway involved — order status is set to pending_payment.
 * Body: { storeSlug, items, customerId?, guestName?, guestEmail?, deliveryType, notes? }
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { loadStore, resolveOrderingLocationId } from '@/lib/sdk/store';
import { getXebokiClient } from '@/lib/sdk/client';
import { sendOrderConfirmation } from '@/lib/email/order-confirmation';

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
  // Both were sent by the checkout and stripped here by Zod, so the customer
  // was billed the full price the screen had already discounted.
  discountCode: z.string().optional(),
  giftCardCode: z.string().optional(),
  shippingAmount: z.number().nonnegative().optional(),
  loyaltyPointsRedeemed: z.number().int().nonnegative().optional(),
});

/**
 * The checkout speaks camelCase; the API's order types are snake_case and it
 * rejects anything outside its set — 'dineIn' was a 400 on every dine-in order.
 */
function toOrderType(deliveryType: 'pickup' | 'delivery' | 'dineIn'): string {
  return deliveryType === 'dineIn' ? 'dine_in' : deliveryType;
}

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

  // Online orders name a location only when the shop has more than one; the
  // API infers a sole location and this stays undefined. null (no ordering-
  // enabled location) is normalised to undefined so the API can still try.
  const locationId = (await resolveOrderingLocationId(resolved.apiKey)) ?? undefined;

  // Step 1: Create the order (pending status)
  let order: { id: string; status: string; total: number };
  try {
    order = await client.ordering.createOrder({
      locationId,
      orderType: toOrderType(body.deliveryType),
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
      discountCode: body.discountCode,
      giftCardCode: body.giftCardCode,
      shippingAmount: body.shippingAmount,
      loyaltyPointsRedeemed: body.loyaltyPointsRedeemed,
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
    await sendOrderConfirmation(client, resolved, paid.id);
    return NextResponse.json({ orderId: paid.id, status: paid.status });
  } catch (err: unknown) {
    // Order is created — return it even if payOrder fails so we don't lose the order
    await sendOrderConfirmation(client, resolved, order.id);
    return NextResponse.json({ orderId: order.id, status: order.status });
  }
}
