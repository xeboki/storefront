/**
 * POST /api/checkout/cod
 *
 * Places an order with Cash on Delivery payment.
 * No payment gateway involved. The order is created PENDING and stays that
 * way: the cash has not been taken yet, and marking it paid at placement
 * reported it complete and booked revenue nobody had collected.
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
  fulfillmentLocationId: z.string().optional(),
  deliveryCity: z.string().optional(),
});

/**
 * The checkout speaks camelCase; the API's order types are snake_case and it
 * rejects anything outside its set — 'dineIn' was a 400 on every dine-in order.
 */
function toOrderType(deliveryType: 'pickup' | 'delivery' | 'dineIn'): string {
  return deliveryType === 'dineIn' ? 'dine_in' : deliveryType;
}

/** Shown to the merchant on the order, since orders carry no payment method. */
const COD_NOTE = 'Payment: cash on delivery — collect at handover.';

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
  const locationId =
    body.fulfillmentLocationId ||
    (await resolveOrderingLocationId(resolved.apiKey)) ||
    undefined;

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
      // No payment-method field exists on the order, so the intent goes in the
      // notes — otherwise a pending order gives the merchant no clue that the
      // cash is to be collected at handover.
      notes: [body.notes?.trim(), COD_NOTE].filter(Boolean).join('\n'),
      tableId: body.tableId,
      deliveryAddress: body.deliveryCity,
      discountCode: body.discountCode,
      giftCardCode: body.giftCardCode,
      shippingAmount: body.shippingAmount,
      loyaltyPointsRedeemed: body.loyaltyPointsRedeemed,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to place order';
    return NextResponse.json({ error: msg }, { status: 422 });
  }

  // The order stays PENDING. It used to be pushed through /orders/{id}/pay,
  // which is the till's "money is in the drawer" endpoint and is documented as
  // moving an order to `completed` — so a cash-on-delivery pickup placed
  // seconds ago reported "Delivered — order complete", counted uncollected
  // cash as revenue, and skipped the whole prepare/ready/collect workflow.
  //
  // Cash on delivery means nobody has paid yet. The merchant records the
  // payment when they actually take it, which completes the order then.
  await sendOrderConfirmation(client, resolved, order.id);
  return NextResponse.json({ orderId: order.id, status: order.status });
}
