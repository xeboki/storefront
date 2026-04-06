/**
 * POST /api/checkout/paypal/capture
 *
 * Called client-side after PayPal Buttons onApprove fires.
 * Captures the PayPal order and confirms the Xeboki order.
 * Body: { storeSlug, paypalOrderId, xebokiOrderId }
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { loadStore } from '@/lib/sdk/store';
import { getXebokiClient } from '@/lib/sdk/client';

const Body = z.object({
  storeSlug: z.string(),
  paypalOrderId: z.string(),
  xebokiOrderId: z.string(),
});

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

  const client = getXebokiClient(resolved.apiKey);

  // Step 1: Capture PayPal order server-side — extract captured amount from response
  let capturedAmountCents: number;
  try {
    const accessToken = await getPayPalToken();
    const base = process.env.PAYPAL_BASE_URL ?? 'https://api-m.sandbox.paypal.com';

    const captureRes = await fetch(
      `${base}/v2/checkout/orders/${body.paypalOrderId}/capture`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );

    if (!captureRes.ok) {
      const errData = await captureRes.json();
      return NextResponse.json(
        { error: errData.message ?? 'PayPal capture failed' },
        { status: 422 },
      );
    }

    const captureData = await captureRes.json();
    // Parse the captured amount from PayPal's response (value is a decimal string like "10.00")
    const captureUnit = captureData?.purchase_units?.[0]?.payments?.captures?.[0];
    const capturedValue = parseFloat(captureUnit?.amount?.value ?? '0');
    // Convert to cents to match Xeboki's integer amount convention
    capturedAmountCents = Math.round(capturedValue * 100);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'PayPal capture failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // Step 2: Mark the Xeboki order as paid using the generic payOrder method —
  // the same pattern the POS app uses for any non-Stripe payment method.
  // If this fails after a successful capture, return 200 so the client still
  // redirects to the order detail page (merchant can reconcile manually).
  try {
    const order = await client.ordering.payOrder(body.xebokiOrderId, {
      method: 'paypal',
      amount: capturedAmountCents,
      reference: body.paypalOrderId,
    });
    return NextResponse.json({ orderId: order.id, status: order.status });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Order confirmation failed';
    return NextResponse.json(
      { orderId: body.xebokiOrderId, status: 'pending', warning: msg },
    );
  }
}
