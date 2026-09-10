/**
 * POST /api/checkout/payment-intent
 *
 * Creates a pending order then generates a Stripe PaymentIntent for it.
 * Returns { clientSecret, publishableKey, orderId } to the client.
 *
 * Flow:
 *   1. Create order with orderType='online' (status = pending)
 *   2. Call createStripePaymentIntent(orderId) on the SDK
 *   3. Return clientSecret + publishableKey to the browser
 *   4. Browser completes payment with Stripe.js
 *   5. Browser calls POST /api/checkout/confirm to finalize
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { loadStore, resolveOrderingLocationId } from '@/lib/sdk/store';
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
  // Both were sent by the checkout and stripped here by Zod, so the customer
  // was charged the full price the screen had already discounted.
  discountCode: z.string().optional(),
  giftCardCode: z.string().optional(),
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

  // Step 1: create a pending order
  let order;
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
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create order';
    return NextResponse.json({ error: msg }, { status: 422 });
  }

  // Step 2: get Stripe payment intent for this order
  let intent;
  try {
    intent = await client.ordering.createStripePaymentIntent(order.id);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create payment intent';
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({
    clientSecret: intent.clientSecret,
    publishableKey: intent.publishableKey,
    orderId: order.id,
    amount: intent.amount,
    currency: intent.currency,
  });
}
