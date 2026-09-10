/**
 * POST /api/cart/capture — record an in-progress cart for abandoned-cart
 * recovery. Best-effort and fire-and-forget from the client; never blocks
 * checkout. Keyed by email server-side.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { loadStore } from '@/lib/sdk/store';
import { getXebokiClient } from '@/lib/sdk/client';

const Body = z.object({
  storeSlug: z.string(),
  email: z.string().email(),
  items: z.array(z.record(z.unknown())).optional(),
  total: z.number().optional(),
});

export async function POST(req: NextRequest) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const resolved = await loadStore(body.storeSlug);
  if (!resolved) return NextResponse.json({ ok: false }, { status: 404 });
  try {
    const client = getXebokiClient(resolved.apiKey);
    await client.ordering.captureAbandonedCart({
      email: body.email,
      items: body.items,
      cartTotal: body.total,
    });
  } catch {
    /* best-effort */
  }
  return NextResponse.json({ ok: true });
}
