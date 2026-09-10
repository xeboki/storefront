/**
 * POST /api/auth/register
 *
 * The client has created a user in the tenant's Firebase Auth and holds a fresh
 * ID token. We create the customer record from it, then exchange the token for
 * a Xeboki session. Passwords never reach this API — they live in Firebase.
 * Body: { storeSlug, idToken, name?, phone? }
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { loadStore } from '@/lib/sdk/store';
import { getXebokiClient } from '@/lib/sdk/client';
import { signSession, SESSION_COOKIE } from '@/lib/auth/session';

const Body = z.object({
  storeSlug: z.string(),
  idToken: z.string().min(1),
  name: z.string().optional(),
  phone: z.string().optional(),
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
    // Create the customer doc, then verify the token to get a session.
    await client.ordering.registerCustomerToken({
      idToken: body.idToken,
      fullName: body.name,
      phone: body.phone,
    });
    auth = await client.ordering.verifyCustomerToken(body.idToken);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Registration failed';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const sessionToken = await signSession({
    customerId: auth.customer.id,
    email: auth.customer.email ?? '',
    name: auth.customer.name,
    storeSlug: body.storeSlug,
    firebaseToken: auth.token,
  });

  const res = NextResponse.json({ customer: auth.customer }, { status: 201 });
  res.cookies.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
  return res;
}
