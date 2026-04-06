/**
 * POST /api/checkout/giftcard
 *
 * Looks up a gift card's balance and validity.
 * Body: { storeSlug, code }
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { loadStore } from '@/lib/sdk/store';
import { getXebokiClient } from '@/lib/sdk/client';

const Body = z.object({
  storeSlug: z.string(),
  code: z.string().min(1),
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
  const card = await client.ordering.getGiftCard(body.code);
  if (!card) return NextResponse.json({ error: 'Gift card not found or invalid' }, { status: 404 });
  if (card.status !== 'active') return NextResponse.json({ error: 'Gift card is not active' }, { status: 422 });

  return NextResponse.json(card);
}
