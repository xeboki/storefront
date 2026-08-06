/**
 * POST /api/classes/[id]/book — claim one place in a group class
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth/session';
import { loadStore } from '@/lib/sdk/store';
import { getXebokiClient } from '@/lib/sdk/client';

const BookBody = z.object({
  storeSlug: z.string(),
  notes: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  let body: z.infer<typeof BookBody>;
  try {
    body = BookBody.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (session.storeSlug !== body.storeSlug) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const resolved = await loadStore(body.storeSlug);
  if (!resolved) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

  const client = getXebokiClient(resolved.apiKey);

  try {
    const booking = await client.ordering.bookClass(id, {
      customerId: session.customerId,
      notes: body.notes,
    });
    return NextResponse.json(booking, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to book the class';

    // A full class and a customer already booked are both ordinary answers,
    // not faults — the page shows them as such rather than as "something went
    // wrong", which would invite the customer to try again and fail again.
    const conflict = /full|already/i.test(msg);
    return NextResponse.json({ error: msg }, { status: conflict ? 409 : 422 });
  }
}
