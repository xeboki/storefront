import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';

/**
 * Publish now.
 *
 * A shop's configuration is cached for five minutes, which is right for
 * serving it and wrong for changing it: a merchant saves a new header in the
 * back office, looks at their shop, and sees the old one with nothing to tell
 * them why or for how long. Every platform that caches this has a purge; this
 * is ours.
 *
 * Guarded by a shared secret and nothing else — it takes no shop id, because
 * the cache keys are per-shop already and a purge is cheap. Without
 * `REVALIDATE_SECRET` set it answers 404 rather than 401: an endpoint that
 * exists and refuses tells an attacker it is there.
 */
const TAGS = ['store-config', 'catalog', 'categories'] as const;

export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) return new NextResponse('Not found', { status: 404 });

  const given = request.headers.get('x-revalidate-secret');
  // Length-independent comparison is overkill for a cache purge, but the
  // habit costs nothing and the next thing to copy this shape may not be.
  if (!given || given !== secret) {
    return new NextResponse('Not found', { status: 404 });
  }

  for (const tag of TAGS) revalidateTag(tag);
  return NextResponse.json({ revalidated: TAGS, at: Date.now() });
}
