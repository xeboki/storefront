/**
 * POST /api/log — receives client-side error reports and forwards them to a
 * configurable sink. Dependency-free observability baseline: set
 * ERROR_WEBHOOK_URL to a Slack/webhook/Sentry-tunnel endpoint, otherwise it
 * logs server-side (visible in Vercel logs). For full tracing, drop in
 * @sentry/nextjs (needs install + SENTRY_DSN) — this route can then forward to
 * the Sentry tunnel unchanged.
 */
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const record = {
    at: new Date().toISOString(),
    ua: req.headers.get('user-agent') ?? '',
    ...(typeof body === 'object' && body ? body : { message: String(body) }),
  };

  const sink = process.env.ERROR_WEBHOOK_URL;
  if (sink) {
    try {
      await fetch(sink, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
        cache: 'no-store',
      });
    } catch {
      console.error('[log] webhook failed', record);
    }
  } else {
    console.error('[client-error]', JSON.stringify(record));
  }
  return NextResponse.json({ ok: true });
}
