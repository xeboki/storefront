/**
 * GET /api/availability — when a service can actually be booked.
 *
 * The booking widget used to generate its own slots in the browser: 09:00 to
 * 17:00 every half hour, every day of the week, ignoring the shop's working
 * days, blocked dates, opening hours, the staff rota, the length of the
 * service and every booking already in the diary. Customers were offered
 * Sundays by shops closed on Sundays, and two customers could be offered the
 * same slot.
 *
 * This proxies the real answer. It runs server-side because the API key must
 * not reach the browser — the same reason every other route here does.
 */
import { NextRequest, NextResponse } from 'next/server';
import { loadStore } from '@/lib/sdk/store';

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const storeSlug = params.get('storeSlug');
  const serviceId = params.get('serviceId');
  const startDate = params.get('startDate');

  if (!storeSlug || !serviceId || !startDate) {
    return NextResponse.json(
      { error: 'storeSlug, serviceId and startDate are required' },
      { status: 400 },
    );
  }

  const resolved = await loadStore(storeSlug);
  if (!resolved) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

  // Deliberately not behind a session check. Availability is what somebody
  // reads *before* deciding to sign in, and requiring an account to see
  // whether a shop has a free Tuesday loses the booking.
  //
  // Forwarded to REST — the SDK has no typed availability method yet — through
  // the gateway, which is what injects the subscriber context the API needs.
  // Same shape as the reviews route beside it.
  const baseUrl = process.env.XEBOKI_API_BASE_URL ?? 'https://api.xeboki.com';
  const url = new URL(`${baseUrl}/v1/pos/appointments/availability/days`);
  url.searchParams.set('service_id', serviceId);
  url.searchParams.set('start_date', startDate);
  url.searchParams.set('days', params.get('days') ?? '7');
  const staffId = params.get('staffId');
  if (staffId) url.searchParams.set('staff_id', staffId);

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${resolved.apiKey}` },
      // Availability changes the moment somebody books, so a cached answer is
      // a double booking waiting to happen. Explicitly no-store rather than a
      // short revalidate: the reviews route beside this one caches for 60
      // seconds, which is right for reviews and wrong for a diary.
      cache: 'no-store',
    });

    if (!res.ok) {
      const detail = await res.text();
      return NextResponse.json(
        { error: 'Could not load availability', detail },
        { status: res.status },
      );
    }
    return NextResponse.json(await res.json());
  } catch {
    // Never invent slots on failure. Showing a made-up grid is exactly what
    // this endpoint exists to stop, and an empty one at least tells the truth.
    return NextResponse.json(
      { error: 'Could not load availability' },
      { status: 502 },
    );
  }
}
