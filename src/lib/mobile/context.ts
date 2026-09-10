/**
 * Backend-for-Frontend (BFF) shared context for the mobile Ordering App.
 *
 * The mobile app holds NO xbk_ key. It signs into the tenant's Firebase, gets an
 * ID token, and exchanges it here (POST /api/mobile/v1/session) for a short
 * storefront session JWT — the SAME signed session the web uses. Every other
 * mobile endpoint requires that session; the BFF then calls the gateway with
 * the store's SERVER-HELD key (+ first-party secret). This is the only place a
 * key touches the wire, and the store is bound into the session so a client can
 * never act on another tenant.
 */
import { NextRequest, NextResponse } from 'next/server';
import type { XebokiClient } from '@xeboki/sdk';
import { loadStore, type ResolvedStore } from '@/lib/sdk/store';
import { getXebokiClient } from '@/lib/sdk/client';
import { verifySession, type SessionPayload } from '@/lib/auth/session';

export function bearer(req: NextRequest): string | null {
  const h = req.headers.get('authorization') ?? '';
  return h.startsWith('Bearer ') ? h.slice(7).trim() : null;
}

export interface MobileContext {
  session: SessionPayload;
  store: ResolvedStore;
  client: XebokiClient;
}

/**
 * Authenticates a mobile request: validates the session JWT, resolves the store
 * it is bound to, and returns a server-side SDK client. Throws a Response on
 * failure so handlers can `return await requireMobile(req)`-guard cleanly.
 */
export async function requireMobile(req: NextRequest): Promise<MobileContext | NextResponse> {
  const token = bearer(req);
  if (!token) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const session = await verifySession(token);
  if (!session?.customerId || !session.storeSlug) {
    return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
  }

  const store = await loadStore(session.storeSlug);
  if (!store) return NextResponse.json({ error: 'Store unavailable' }, { status: 404 });

  return { session, store, client: getXebokiClient(store.apiKey) };
}

export function isResponse(x: MobileContext | NextResponse): x is NextResponse {
  return x instanceof NextResponse;
}
