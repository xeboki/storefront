/**
 * PATCH /api/appointments/[id] — a customer cancels their own booking.
 *
 * It checked the session and the store slug and then passed the id straight
 * through. Nothing tied the id to the person: any signed-in shopper could
 * cancel a stranger's appointment by sending somebody else's id, and the
 * accepted statuses included `no_show` — a mark on another customer's
 * record, set by a customer. The order page has had the matching check
 * since it was written (`order.customerId !== session.customerId`); this
 * route never grew one.
 *
 * Two things are enforced here now: the booking belongs to the caller, and
 * `cancelled` is the only thing a shopper may set. Confirming a booking and
 * marking a no-show are the shop's decisions.
 *
 * Still outstanding, and deliberately not done here: the API has a
 * `PATCH /appointments/{id}/customer-cancel` written for exactly this, with
 * the shop's opt-in flag, its notice window and a confirmation code. This
 * route calls the back-office transition instead, so a shop that has not
 * turned self-cancellation on, or that publishes 24 hours' notice, is
 * overridden. Routing this through that endpoint belongs with the
 * appointments module, together with the SDK method it has never had.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth/session';
import { loadStore } from '@/lib/sdk/store';
import { getXebokiClient } from '@/lib/sdk/client';

const PatchBody = z.object({
  storeSlug: z.string(),
  // A customer cancels. They do not confirm their own booking, and they
  // certainly do not record themselves as a no-show.
  status: z.literal('cancelled'),
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

  // Whose booking is this? Read it before touching it — the id in the URL
  // is the caller's claim, not a fact. A booking that is not theirs gets
  // the same 404 a booking that does not exist gets, so the endpoint does
  // not confirm that somebody else's id is real.
  const existing = await client.ordering.getAppointment(params.id).catch(() => null);
  if (!existing || existing.customerId !== session.customerId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const updated = await client.ordering.updateAppointmentStatus(params.id, body.status);
    return NextResponse.json(updated);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update appointment';
    return NextResponse.json({ error: msg }, { status: 422 });
  }
}
