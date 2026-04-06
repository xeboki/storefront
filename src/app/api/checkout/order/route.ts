/**
 * POST /api/checkout/confirm
 *
 * Called after Stripe.js successfully confirms payment on the client.
 * Marks the order as paid via confirmStripePayment.
 * Body: { storeSlug, orderId, paymentIntentId }
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { loadStore } from '@/lib/sdk/store';
import { getXebokiClient } from '@/lib/sdk/client';

const Body = z.object({
  storeSlug: z.string(),
  orderId: z.string(),
  paymentIntentId: z.string(),
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

  const result = await client.ordering.confirmStripePayment(
    body.orderId,
    body.paymentIntentId,
  );

  return NextResponse.json({ orderId: result.orderId, status: result.status });
}
