/**
 * Work order public lookup.
 *
 * This route used to be a 501. It was written against `client.workOrders`,
 * which never existed on the SDK, and against a public endpoint that had not
 * been built — so the page in front of it looked finished and answered "not
 * available yet" to every customer who used it.
 *
 * SPEC-079 built the endpoint. This calls it directly rather than waiting for
 * an SDK product: the storefront already holds the API key, and one HTTP call
 * behind a server route is not worth a new SDK surface.
 *
 * Authorisation is ticket number **plus** the phone number on the job. A ticket
 * number alone is guessable — they are sequential — and a phone number alone
 * would list everything that person has ever brought in. The API returns the
 * same 404 for "no such ticket" and "wrong phone", so this route must not
 * distinguish them either.
 */
import { NextRequest, NextResponse } from 'next/server'
import { loadStore } from '@/lib/sdk/store'

/**
 * The POS API — `api.pos.xeboki.com`, deliberately not `api.xeboki.com`.
 *
 * They are different services. Repair endpoints live on the POS API, and the
 * POS API's own working notes record that defaulting to the other host has
 * already shipped dead links inside an email once.
 *
 * Its own variable rather than reusing `XEBOKI_API_BASE_URL`, which the SDK
 * client and three other routes point at the ordering host.
 */
const POS_API_BASE =
  process.env.XEBOKI_POS_API_BASE_URL ?? 'https://api.pos.xeboki.com'

/**
 * Display metadata for the statuses a customer may see.
 *
 * Keyed by the status names the Pro app actually serialises. The previous
 * version of this map used a different vocabulary entirely (`received`,
 * `diagnosing`, `waiting_parts`) that no work order has ever been written
 * with, so every lookup would have fallen through to the default.
 *
 * Not exported: a route module may only export handlers and route config.
 */
const STATUS_META: Record<string, { label: string; color: string }> = {
  pending:          { label: 'Received',           color: '#6B7280' },
  diagnosed:        { label: 'Diagnosed',          color: '#F59E0B' },
  awaitingApproval: { label: 'Awaiting your OK',   color: '#F59E0B' },
  awaitingParts:    { label: 'Parts on order',     color: '#8B5CF6' },
  inProgress:       { label: 'Being worked on',    color: '#3B82F6' },
  qcTesting:        { label: 'Final testing',      color: '#3B82F6' },
  completed:        { label: 'Ready to collect',   color: '#10B981' },
  readyForPickup:   { label: 'Ready to collect',   color: '#10B981' },
  delivered:        { label: 'Collected',          color: '#059669' },
  closed:           { label: 'Closed',             color: '#059669' },
  onHold:           { label: 'On hold',            color: '#6B7280' },
  declined:         { label: 'Quote declined',     color: '#EF4444' },
  unrepairable:     { label: 'Cannot be repaired', color: '#EF4444' },
  cancelled:        { label: 'Cancelled',          color: '#EF4444' },
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const store = searchParams.get('store')
  const ticket = searchParams.get('ticket')?.trim()
  const phone = searchParams.get('phone')?.trim()

  if (!store || !ticket || !phone) {
    return NextResponse.json(
      { error: 'Enter both your ticket number and the phone number on the job.' },
      { status: 400 },
    )
  }

  const resolved = await loadStore(store)
  if (!resolved) {
    return NextResponse.json({ error: 'Store not found' }, { status: 404 })
  }

  const url = new URL('/repairs/status', POS_API_BASE)
  url.searchParams.set('ticket_number', ticket)
  url.searchParams.set('phone', phone)

  let res: Response
  try {
    res = await fetch(url, {
      headers: { 'X-API-Key': resolved.apiKey },
      // A repair moves through statuses during the day, and a customer
      // refreshing to see whether it is ready must not be served a cached
      // "being worked on" from twenty minutes ago.
      cache: 'no-store',
    })
  } catch {
    return NextResponse.json(
      { error: 'Could not reach the shop right now. Please try again shortly.' },
      { status: 502 },
    )
  }

  if (res.status === 404) {
    // Same message for "no such ticket" and "phone does not match" — telling
    // them apart turns this into a way to test which tickets exist.
    return NextResponse.json(
      {
        error:
          'We could not find that repair. Check the ticket number and the ' +
          'phone number you gave the shop.',
      },
      { status: 404 },
    )
  }

  if (!res.ok) {
    return NextResponse.json(
      { error: 'Could not look that up right now.' },
      { status: 502 },
    )
  }

  const job = (await res.json()) as {
    ticket_number?: string
    status?: string
    is_ready?: boolean
    device?: string
    received_at?: string
    estimated_ready?: string
  }

  const meta = STATUS_META[job.status ?? ''] ?? {
    label: 'In progress',
    color: '#6B7280',
  }

  return NextResponse.json({
    ticketNumber: job.ticket_number ?? ticket,
    status: job.status ?? '',
    statusLabel: meta.label,
    statusColor: meta.color,
    isReady: job.is_ready === true,
    device: job.device ?? '',
    receivedAt: job.received_at ?? null,
    estimatedReady: job.estimated_ready ?? null,
  })
}
