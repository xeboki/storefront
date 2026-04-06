/**
 * GET /api/orders/[orderId]?storeSlug=X
 *
 * Returns a single order. Used by the client-side polling loop in OrderDetail.
 * Access rules:
 *   - Authenticated customer: allowed if order belongs to them (or order has no customerId = guest)
 *   - No session: allowed — orderId is an opaque token and needed for guest order tracking
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { loadStore } from '@/lib/sdk/store';
import { getXebokiClient } from '@/lib/sdk/client';

interface Params {
  params: { orderId: string };
}

export async function GET(req: NextRequest, { params }: Params) {
  const storeSlug = req.nextUrl.searchParams.get('storeSlug');
  if (!storeSlug) {
    return NextResponse.json({ error: 'storeSlug is required' }, { status: 400 });
  }

  const resolved = await loadStore(storeSlug);
  if (!resolved) {
    return NextResponse.json({ error: 'Store not found' }, { status: 404 });
  }

  const client = getXebokiClient(resolved.apiKey);

  let order;
  try {
    order = await client.ordering.getOrder(params.orderId);
  } catch {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  // If session exists, verify the order belongs to this customer
  const session = await getSession();
  if (session && order.customerId && order.customerId !== session.customerId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json(order);
}
