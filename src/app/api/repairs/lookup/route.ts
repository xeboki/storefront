/**
 * Work order public lookup — Gap 53.
 * Query by work order number or customer phone number.
 * Returns a sanitised view (no internal notes, no PII beyond what customer needs).
 */
import { NextRequest, NextResponse } from 'next/server'
import { getStoreClient } from '@/lib/sdk/client'

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

  try {
    const client = await getStoreClient(store)
    if (!client) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    // Look up work order via SDK
    const result = await client.workOrders.lookup({ query: q })
    if (!result) {
      return NextResponse.json({ error: 'Work order not found' }, { status: 404 })
    }

    const meta = STATUS_META[result.status] ?? { label: result.status, color: '#666' }

    // Return sanitised public view
    return NextResponse.json({
      id: result.id,
      workOrderNumber: result.workOrderNumber,
      customerName: result.customerName,
      deviceDescription: result.deviceDescription ?? result.title,
      status: result.status,
      statusLabel: meta.label,
      statusColor: meta.color,
      estimatedCompletionDate: result.estimatedCompletionDate,
      completedAt: result.completedAt,
      // Only show technician notes marked as public
      technicianNotes: result.publicNotes ?? null,
      items: (result.items ?? []).map((item: Record<string, unknown>) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        status: item.status,
      })),
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Lookup failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
