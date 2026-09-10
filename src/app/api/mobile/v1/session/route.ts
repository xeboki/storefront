/**
 * POST /api/mobile/v1/session
 * Body: { store: slug, idToken: <Firebase ID token> }
 *
 * Exchanges a tenant Firebase ID token for a storefront session JWT. The token
 * is verified against THAT store's Firebase (via the API's firebase-verify), so
 * a token from any other project is rejected. Returns { session, customer }.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { loadStore } from '@/lib/sdk/store';
import { getXebokiClient } from '@/lib/sdk/client';
import { signSession } from '@/lib/auth/session';

const Body = z.object({ store: z.string().min(1), idToken: z.string().min(1) });

export async function POST(req: NextRequest) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'store and idToken are required' }, { status: 400 });
  }

  const store = await loadStore(body.store);
  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

  const client = getXebokiClient(store.apiKey);
  let auth;
  try {
    auth = await client.ordering.verifyCustomerToken(body.idToken);
  } catch {
    return NextResponse.json({ error: 'Could not verify your sign-in.' }, { status: 401 });
  }

  const session = await signSession({
    customerId: auth.customer.id,
    email: auth.customer.email ?? '',
    name: auth.customer.name,
    storeSlug: body.store,
    firebaseToken: auth.token,
  });

  return NextResponse.json({ session, customer: auth.customer });
}
