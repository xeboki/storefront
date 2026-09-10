/**
 * GET /api/auth/firebase-config?store=<slug>
 *
 * Returns the tenant's PUBLIC Firebase Web config so the browser can run
 * customer auth (createUser / signIn) against the merchant's own Firebase Auth.
 * These fields are client-safe by design — no service account, no secrets.
 */
import { NextRequest, NextResponse } from 'next/server';
import { loadStore } from '@/lib/sdk/store';
import { getXebokiClient } from '@/lib/sdk/client';

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('store');
  if (!slug) return NextResponse.json({ error: 'store is required' }, { status: 400 });

  const resolved = await loadStore(slug);
  if (!resolved) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

  try {
    const client = getXebokiClient(resolved.apiKey);
    const cfg = await client.ordering.getFirestoreConfig();
    if (!cfg.apiKey || !cfg.projectId) {
      return NextResponse.json({ error: 'accounts-unavailable' }, { status: 503 });
    }
    return NextResponse.json(cfg);
  } catch {
    // Firebase not configured for this merchant — accounts simply aren't available.
    return NextResponse.json({ error: 'accounts-unavailable' }, { status: 503 });
  }
}
