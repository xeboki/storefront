/**
 * POST /api/auth/login
 *
 * Authenticates an ordering customer via the Xeboki SDK and sets a session cookie.
 * Body: { storeSlug, email, password }
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { loadStore } from '@/lib/sdk/store';
import { getXebokiClient } from '@/lib/sdk/client';
import { signSession, SESSION_COOKIE } from '@/lib/auth/session';

const Body = z.object({
  storeSlug: z.string(),
  email: z.string().email(),
  password: z.string().min(1),
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
    // SDK signature: loginCustomer({ email, password })
    auth = await client.ordering.loginCustomer({ email: body.email, password: body.password });
  } catch {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const sessionToken = await signSession({
    customerId: auth.customer.id,
    email: auth.customer.email ?? body.email,
    name: auth.customer.name,
    storeSlug: body.storeSlug,
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
