/**
 * POST /api/account/addresses — add a new address for the authenticated customer
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifySession, SESSION_COOKIE } from '@/lib/auth/session';
import { loadStore } from '@/lib/sdk/store';
import { getXebokiClient } from '@/lib/sdk/client';

const Body = z.object({
  storeSlug: z.string(),
  customerId: z.string(),
  label: z.string().optional(),
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().optional(),
  postcode: z.string().min(1),
  country: z.string().min(1).default('US'),
  isDefault: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
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
  const address = await client.ordering.addCustomerAddress(body.customerId, {
    label: body.label,
    line1: body.line1,
    line2: body.line2,
    city: body.city,
    state: body.state,
    postcode: body.postcode,
    country: body.country,
    isDefault: body.isDefault,
  });

  return NextResponse.json({ address }, { status: 201 });
}
