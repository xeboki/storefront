/**
 * GET /api/classes?storeSlug=X — bookable group classes
 *
 * Public: a customer has to be able to see what is on before deciding whether
 * to make an account. Booking one does require a session, which is handled in
 * ./[id]/book.
 */
import { NextRequest, NextResponse } from 'next/server';
import { loadStore } from '@/lib/sdk/store';
import { getXebokiClient } from '@/lib/sdk/client';

export async function GET(req: NextRequest) {
  const storeSlug = req.nextUrl.searchParams.get('storeSlug');
  if (!storeSlug) {
    return NextResponse.json({ error: 'storeSlug is required' }, { status: 400 });
  }

  const resolved = await loadStore(storeSlug);
  if (!resolved) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

  const client = getXebokiClient(resolved.apiKey);

  try {
    // Sold-out classes are asked for deliberately. Hiding them makes a busy
    // timetable look empty, and a customer who cannot see the class they
    // attend every week assumes the site is broken rather than that it is full.
    const result = await client.ordering.listClasses({ includeFull: true });
    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to load classes';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
