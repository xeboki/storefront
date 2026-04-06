/**
 * GET  /api/appointments?storeSlug=X  — list customer's appointments
 * POST /api/appointments               — create a new appointment
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth/session';
import { loadStore } from '@/lib/sdk/store';
import { getXebokiClient } from '@/lib/sdk/client';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const storeSlug = req.nextUrl.searchParams.get('storeSlug');
  if (!storeSlug || session.storeSlug !== storeSlug) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const resolved = await loadStore(storeSlug);
  if (!resolved) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

  const client = getXebokiClient(resolved.apiKey);
  const result = await client.ordering.listAppointments({ customerId: session.customerId });
  return NextResponse.json(result);
}

const CreateBody = z.object({
  storeSlug: z.string(),
  serviceId: z.string(),
  staffId: z.string().optional(),
  startTime: z.string(),
  durationMinutes: z.number().int().positive().optional(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: z.infer<typeof CreateBody>;
  try {
    body = CreateBody.parse(await req.json());
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
    const appointment = await client.ordering.createAppointment({
      customerId: session.customerId,
      serviceId: body.serviceId,
      staffId: body.staffId,
      startTime: body.startTime,
      durationMinutes: body.durationMinutes,
      notes: body.notes,
    });
    return NextResponse.json(appointment, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create appointment';
    return NextResponse.json({ error: msg }, { status: 422 });
  }
}
