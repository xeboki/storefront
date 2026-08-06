/**
 * Work order public lookup — Gap 53.
 *
 * NOT IMPLEMENTED. This route called `client.workOrders.lookup(...)`, and
 * there is no `workOrders` product on the SDK and no public work-order
 * endpoint on the API — it was written against both before either existed.
 * The file therefore never compiled, and a file that does not compile fails
 * the entire build, not just its own route.
 *
 * It answers honestly rather than being deleted: the intent is clear, and
 * what is missing is a public endpoint plus an SDK product, not a decision to
 * drop repair tracking. The sanitised response shape the page expects is kept
 * below as the specification for whoever builds it — status label and colour,
 * public technician notes only, and no PII beyond what the customer already
 * knows.
 *
 * To finish it:
 *   1. add a public lookup endpoint to POS/API (by work order number or
 *      customer phone, rate-limited — it is unauthenticated by design),
 *   2. add a `workOrders` product to the SDK wrapping it,
 *   3. replace the 501 below with the mapping described here.
 */
import { NextRequest, NextResponse } from 'next/server'
import { loadStore } from '@/lib/sdk/store'

// Not exported: a route module may only export handlers and route config.
const STATUS_META: Record<string, { label: string; color: string }> = {
  received:      { label: 'Received',       color: '#6B7280' },
  diagnosing:    { label: 'Diagnosing',     color: '#F59E0B' },
  in_progress:   { label: 'In Progress',    color: '#3B82F6' },
  waiting_parts: { label: 'Parts Ordered',  color: '#8B5CF6' },
  ready:         { label: 'Ready for Pickup', color: '#10B981' },
  completed:     { label: 'Completed',      color: '#059669' },
  cancelled:     { label: 'Cancelled',      color: '#EF4444' },
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const store = searchParams.get('store')
  const q = searchParams.get('q')?.trim()

  if (!store || !q) {
    return NextResponse.json({ error: 'Missing store or query' }, { status: 400 })
  }

  // Still resolved, so an unknown storefront gets the same 404 it always would
  // — a customer typing the wrong address should be told that, not told the
  // feature is missing.
  const resolved = await loadStore(store)
  if (!resolved) {
    return NextResponse.json({ error: 'Store not found' }, { status: 404 })
  }

  return NextResponse.json(
    { error: 'Repair status lookup is not available yet.' },
    { status: 501 },
  )
}
