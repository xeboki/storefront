/**
 * GET  /api/orders/[orderId]/returns?storeSlug=X  — list return requests
 * POST /api/orders/[orderId]/returns              — request a return
 *
 * Self-service returns for a fulfilled order. The order id is the capability
 * (same model as order tracking); a logged-in customer must own the order.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth/session';
import { loadStore } from '@/lib/sdk/store';
import { getXebokiClient } from '@/lib/sdk/client';

interface Params {
  params: { orderId: string };
}

async function resolveAndAuthorize(storeSlug: string | null, orderId: string) {
  if (!storeSlug) return { error: 'storeSlug is required', status: 400 as const };
  const resolved = await loadStore(storeSlug);
  if (!resolved) return { error: 'Store not found', status: 404 as const };
  const client = getXebokiClient(resolved.apiKey);
  // Confirm the order exists and, if a session is present, that it's theirs.
  let order;
  try {
    order = await client.ordering.getOrder(orderId);
  } catch {
    return { error: 'Order not found', status: 404 as const };
  }
  const session = await getSession();
  if (session && order.customerId && order.customerId !== session.customerId) {
    return { error: 'Forbidden', status: 403 as const };
  }
  return { client, order };
}

export async function GET(req: NextRequest, { params }: Params) {
  const r = await resolveAndAuthorize(req.nextUrl.searchParams.get('storeSlug'), params.orderId);
  if ('error' in r) return NextResponse.json({ error: r.error }, { status: r.status });
  try {
    const returns = await r.client.ordering.listReturns(params.orderId);
    return NextResponse.json({ returns });
  } catch {
    return NextResponse.json({ returns: [] });
  }
}

const Body = z.object({
  storeSlug: z.string(),
  reason: z.string().min(1),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: Params) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'Please give a reason for the return.' }, { status: 400 });
  }
  const r = await resolveAndAuthorize(body.storeSlug, params.orderId);
  if ('error' in r) return NextResponse.json({ error: r.error }, { status: r.status });
  try {
    const ret = await r.client.ordering.requestReturn(params.orderId, {
      reason: body.reason,
      notes: body.notes,
      customerEmail: r.order.customerEmail ?? undefined,
    });
    return NextResponse.json(ret, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Could not submit the return.';
    return NextResponse.json({ error: msg }, { status: 422 });
  }
}
