/**
 * GET /api/orders?storeSlug=X
 *
 * Returns the authenticated customer's order history.
 * Requires a valid session cookie.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { loadStore } from '@/lib/sdk/store';
import { getXebokiClient } from '@/lib/sdk/client';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const storeSlug = req.nextUrl.searchParams.get('storeSlug');
  if (!storeSlug) {
    return NextResponse.json({ error: 'storeSlug is required' }, { status: 400 });
  }

  if (session.storeSlug !== storeSlug) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const resolved = await loadStore(storeSlug);
  if (!resolved) {
    return NextResponse.json({ error: 'Store not found' }, { status: 404 });
  }

  const client = getXebokiClient(resolved.apiKey);

  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '20'), 50);
  const offset = parseInt(req.nextUrl.searchParams.get('offset') ?? '0');
  const status = req.nextUrl.searchParams.get('status') ?? undefined;

  const result = await client.ordering.listOrders({
    customerId: session.customerId,
    status,
    limit,
    offset,
  });

  return NextResponse.json(result);
}
