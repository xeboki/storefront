/**
 * PATCH /api/appointments/[id]  — cancel or reschedule an appointment
 * Body: { storeSlug, status }   (status = 'cancelled' | 'rescheduled')
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth/session';
import { loadStore } from '@/lib/sdk/store';
import { getXebokiClient } from '@/lib/sdk/client';

const PatchBody = z.object({
  storeSlug: z.string(),
  status: z.enum(['cancelled', 'confirmed', 'no_show']),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: z.infer<typeof PatchBody>;
  try {
    body = PatchBody.parse(await req.json());
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
    const updated = await client.ordering.updateAppointmentStatus(params.id, body.status);
    return NextResponse.json(updated);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update appointment';
    return NextResponse.json({ error: msg }, { status: 422 });
  }
}
