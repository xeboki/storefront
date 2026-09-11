/**
 * POST /api/checkout/paypal/create
 *
 * Creates a pending Xeboki order then a PayPal order for it.
 * Returns { paypalOrderId, xebokiOrderId, clientId, amount, currency }
 *
 * Flow:
 *   1. Create pending Xeboki order (paymentMethod = 'paypal')
 *   2. Get PayPal access token via client_credentials
 *   3. Create PayPal order (intent = CAPTURE)
 *   4. Return IDs to browser — browser renders PayPal Buttons
 *   5. After approval browser calls POST /api/checkout/paypal/capture
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

async function getPayPalToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !secret) throw new Error('PayPal credentials not configured');

  const base = process.env.PAYPAL_BASE_URL ?? 'https://api-m.sandbox.paypal.com';
  const credentials = Buffer.from(`${clientId}:${secret}`).toString('base64');

  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  });

  if (!res.ok) throw new Error('Failed to obtain PayPal access token');
  const data = await res.json();
  return data.access_token as string;
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

  const clientId = process.env.PAYPAL_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'PayPal is not configured for this store' }, { status: 503 });
  }

  const client = getXebokiClient(resolved.apiKey);

  // Online orders name a location only when the shop has more than one; the
  // API infers a sole location and this stays undefined. null (no ordering-
  // enabled location) is normalised to undefined so the API can still try.
  const locationId =
    body.fulfillmentLocationId ||
    (await resolveOrderingLocationId(resolved.apiKey)) ||
    undefined;

  // Step 1: Create pending Xeboki order
  let order: { id: string; total: number; currency?: string };
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
      deliveryAddress: body.deliveryCity,
      discountCode: body.discountCode,
      giftCardCode: body.giftCardCode,
      shippingAmount: body.shippingAmount,
      loyaltyPointsRedeemed: body.loyaltyPointsRedeemed,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create order';
    return NextResponse.json({ error: msg }, { status: 422 });
  }

  // Step 2: Create PayPal order
  let paypalOrderId: string;
  try {
    const accessToken = await getPayPalToken();
    const base = process.env.PAYPAL_BASE_URL ?? 'https://api-m.sandbox.paypal.com';
    const currency = (order.currency ?? 'USD').toUpperCase();
    // order.total is assumed to be in cents; convert to decimal string
    const value = (order.total / 100).toFixed(2);

    const ppRes = await fetch(`${base}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': order.id,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: order.id,
            amount: { currency_code: currency, value },
          },
        ],
      }),
    });

    if (!ppRes.ok) {
      const errData = await ppRes.json();
      throw new Error(errData.message ?? 'PayPal order creation failed');
    }

    const ppData = await ppRes.json();
    paypalOrderId = ppData.id as string;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create PayPal order';
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({
    paypalOrderId,
    xebokiOrderId: order.id,
    clientId,
    amount: order.total,
    currency: order.currency ?? 'usd',
  });
}
