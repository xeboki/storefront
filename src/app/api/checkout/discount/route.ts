/**
 * POST /api/checkout/discount
 *
 * Validates a discount code against the store's rules.
 * Body: { storeSlug, code, orderTotal }
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { loadStore } from '@/lib/sdk/store';
import { getXebokiClient } from '@/lib/sdk/client';

const Body = z.object({
  storeSlug: z.string(),
  code: z.string().min(1),
  orderTotal: z.number().optional(),
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

  const client = getXebokiClient(resolved.apiKey);
  const result = await client.ordering.validateDiscount(body.code, {
    orderTotal: body.orderTotal,
  });

  return NextResponse.json(result);
}
