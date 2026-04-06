/**
 * GET  /api/reviews?storeSlug=X&productId=Y — list approved reviews for a product
 * POST /api/reviews                          — submit a review (requires session)
 *
 * Reviews are stored in the subscriber's Firestore `product_reviews` collection
 * via the Xeboki API.  Until the SDK exposes a typed method, we forward directly
 * to the REST endpoint.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth/session';
import { loadStore } from '@/lib/sdk/store';
import { getXebokiClient } from '@/lib/sdk/client';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const storeSlug = searchParams.get('storeSlug');
  const productId = searchParams.get('productId');

  if (!storeSlug || !productId) {
    return NextResponse.json({ error: 'storeSlug and productId required' }, { status: 400 });
  }

  const resolved = await loadStore(storeSlug);
  if (!resolved) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

  try {
    // Forward to REST API — SDK does not yet have a typed reviews method.
    const baseUrl = process.env.XEBOKI_API_BASE_URL ?? 'https://api.xeboki.com';
    const res = await fetch(
      `${baseUrl}/v1/pos/products/${encodeURIComponent(productId)}/reviews?approved=true`,
      { headers: { Authorization: `Bearer ${resolved.apiKey}` }, next: { revalidate: 60 } },
    );

    if (!res.ok) return NextResponse.json({ reviews: [], total: 0 });

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ reviews: [], total: 0 });
  }
}

const PostBody = z.object({
  storeSlug: z.string(),
  productId: z.string(),
  rating: z.number().int().min(1).max(5),
  title: z.string().optional(),
  body: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: z.infer<typeof PostBody>;
  try {
    body = PostBody.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (session.storeSlug !== body.storeSlug) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const resolved = await loadStore(body.storeSlug);
  if (!resolved) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

  try {
    const baseUrl = process.env.XEBOKI_API_BASE_URL ?? 'https://api.xeboki.com';
    const res = await fetch(
      `${baseUrl}/v1/pos/products/${encodeURIComponent(body.productId)}/reviews`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resolved.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer_id: session.customerId,
          rating: body.rating,
          title: body.title ?? '',
          body: body.body ?? '',
        }),
      },
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json({ error: err.message ?? 'Failed to submit review' }, { status: 422 });
    }

    const review = await res.json();
    return NextResponse.json(review, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to submit review';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
