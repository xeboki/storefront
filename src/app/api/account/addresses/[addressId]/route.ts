/**
 * DELETE /api/account/addresses/[addressId] — remove an address
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifySession, SESSION_COOKIE } from '@/lib/auth/session';
import { loadStore } from '@/lib/sdk/store';
import { getXebokiClient } from '@/lib/sdk/client';

const Body = z.object({
  storeSlug: z.string(),
  customerId: z.string(),
});

export async function DELETE(
  req: NextRequest,
  { params }: { params: { addressId: string } },
) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  if (session.customerId !== body.customerId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const resolved = await loadStore(body.storeSlug);
  if (!resolved) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

  const client = getXebokiClient(resolved.apiKey);
  await client.ordering.deleteCustomerAddress(body.customerId, params.addressId);

  return NextResponse.json({ ok: true });
}
