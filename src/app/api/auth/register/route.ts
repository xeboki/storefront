/**
 * POST /api/auth/register
 *
 * Registers a new ordering customer.
 * Body: { storeSlug, name, email, password, phone? }
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { loadStore } from '@/lib/sdk/store';
import { getXebokiClient } from '@/lib/sdk/client';
import { signSession, SESSION_COOKIE } from '@/lib/auth/session';

const Body = z.object({
  storeSlug: z.string(),
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
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
    // SDK signature: registerCustomer({ email, password, fullName?, phone? })
    auth = await client.ordering.registerCustomer({
      email: body.email,
      password: body.password,
      fullName: body.name,
      phone: body.phone,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Registration failed';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const sessionToken = await signSession({
    customerId: auth.customer.id,
    email: auth.customer.email ?? body.email,
    name: auth.customer.name,
    storeSlug: body.storeSlug,
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
