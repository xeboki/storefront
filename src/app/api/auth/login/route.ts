/**
 * POST /api/auth/login
 *
 * The client has already signed in against the tenant's Firebase Auth and holds
 * a Firebase ID token; we exchange it for a Xeboki customer session. There is
 * no email/password endpoint on the API — passwords live in Firebase.
 * Body: { storeSlug, idToken }
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { loadStore } from '@/lib/sdk/store';
import { getXebokiClient } from '@/lib/sdk/client';
import { signSession, SESSION_COOKIE } from '@/lib/auth/session';

const Body = z.object({
  storeSlug: z.string(),
  idToken: z.string().min(1),
});

export async function POST(req: NextRequest) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const resolved = await loadStore(body.storeSlug);
  if (!resolved) {
    return NextResponse.json({ error: 'Store not found' }, { status: 404 });
  }

  const client = getXebokiClient(resolved.apiKey);

  let auth;
  try {
    auth = await client.ordering.verifyCustomerToken(body.idToken);
  } catch {
    return NextResponse.json({ error: 'Could not sign you in. Please try again.' }, { status: 401 });
  }

  const sessionToken = await signSession({
    customerId: auth.customer.id,
    email: auth.customer.email ?? '',
    name: auth.customer.name,
    storeSlug: body.storeSlug,
    firebaseToken: auth.token,
  });

  const res = NextResponse.json({ customer: auth.customer });
  res.cookies.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
  return res;
}
