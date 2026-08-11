/**
 * Repair quote — read and answer.
 *
 * Sits between the approval page and the POS API so the customer's browser
 * never sees the store's API key, and so the subscriber id stays out of a URL
 * that arrives by email and gets forwarded.
 *
 * The `t` token is the only authorisation. It is passed straight through and
 * never logged.
 */
import { NextRequest, NextResponse } from 'next/server'
import { loadStore } from '@/lib/sdk/store'

/** See the note in `../lookup/route.ts` — the POS API is its own host. */
const POS_API_BASE =
  process.env.XEBOKI_POS_API_BASE_URL ?? 'https://api.pos.xeboki.com'

/** Messages a customer can act on, for the statuses the API refuses with. */
function messageFor(status: number, fallback: string): string {
  if (status === 404) {
    return 'We could not find this quote. Please use the link from the most recent email the shop sent you.'
  }
  if (status === 410) {
    return 'This quote is no longer current — the shop has either replaced it or it has expired. Please ring them for an up-to-date price.'
  }
  return fallback
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const store = searchParams.get('store')
  const estimateId = searchParams.get('e')
  const token = searchParams.get('t')

  if (!store || !estimateId || !token) {
    return NextResponse.json({ error: 'Incomplete link.' }, { status: 400 })
  }

  const resolved = await loadStore(store)
  if (!resolved) {
    return NextResponse.json({ error: 'Store not found' }, { status: 404 })
  }

  const url = new URL('/repairs/estimate', POS_API_BASE)
  url.searchParams.set('estimate_id', estimateId)
  url.searchParams.set('token', token)

  let res: Response
  try {
    res = await fetch(url, {
      headers: { 'X-API-Key': resolved.apiKey },
      // A quote can be superseded while the customer is reading it. Serving a
      // cached copy would let them approve a price the shop has withdrawn.
      cache: 'no-store',
    })
  } catch {
    return NextResponse.json(
      { error: 'Could not reach the shop right now. Please try again shortly.' },
      { status: 502 },
    )
  }

  if (!res.ok) {
    return NextResponse.json(
      { error: messageFor(res.status, 'Could not load this quote.') },
      { status: res.status === 410 ? 410 : res.status === 404 ? 404 : 502 },
    )
  }

  return NextResponse.json(await res.json())
}

export async function POST(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const store = searchParams.get('store')
  if (!store) {
    return NextResponse.json({ error: 'Incomplete link.' }, { status: 400 })
  }

  const resolved = await loadStore(store)
  if (!resolved) {
    return NextResponse.json({ error: 'Store not found' }, { status: 404 })
  }

  const body = (await req.json().catch(() => null)) as {
    estimate_id?: string
    public_token?: string
    accepted_line_ids?: string[]
    approved_by_name?: string
    decline_reason?: string
  } | null

  if (!body?.estimate_id || !body?.public_token) {
    return NextResponse.json({ error: 'Incomplete link.' }, { status: 400 })
  }

  let res: Response
  try {
    res = await fetch(new URL('/repairs/estimate/respond', POS_API_BASE), {
      method: 'POST',
      headers: {
        'X-API-Key': resolved.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
  } catch {
    return NextResponse.json(
      { error: 'Could not send your answer. Please try again shortly.' },
      { status: 502 },
    )
  }

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    return NextResponse.json(
      {
        error: messageFor(
          res.status,
          'Could not record your answer. Please ring the shop.',
        ),
      },
      { status: res.status === 410 ? 410 : 502 },
    )
  }

  return NextResponse.json(data)
}
