/**
 * POST /api/blog/[slug]/comments — a reader replies to a post.
 *
 * It goes through the server rather than straight from the browser for the
 * reason the whole storefront does: the shop's API key stays here. It was
 * in the page HTML until this week, and the fix was to stop sending it —
 * so a client component cannot call the API directly even if it wanted to.
 *
 * Nothing is decided here. Whether comments are on, whether this post is
 * still open, whether a guest may post and whether the comment waits for
 * the merchant are all the server's call, because a rule enforced by a form
 * is a rule a direct POST ignores. This route carries the answer back.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth/session';
import { loadStore } from '@/lib/sdk/store';
import { getXebokiClient } from '@/lib/sdk/client';

const Body = z.object({
  storeSlug: z.string().min(1),
  body: z.string().min(1).max(4000),
  authorName: z.string().max(120).optional(),
  authorEmail: z.string().max(200).optional(),
  parentId: z.string().max(120).optional(),
  // The honeypot. Hidden in the form, so a person never fills it; a bot
  // fills in every field it finds. Passed straight through — the decision
  // about what it means belongs with the other decisions.
  website: z.string().max(200).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } },
) {
  let payload: z.infer<typeof Body>;
  try {
    payload = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const resolved = await loadStore(payload.storeSlug);
  if (!resolved) {
    return NextResponse.json({ error: 'Store not found' }, { status: 404 });
  }

  // A signed-in reader comments under the name the shop already has, so
  // the form does not ask for something they have given before.
  const session = await getSession();
  const signedIn = session?.storeSlug === payload.storeSlug ? session : null;

  const client = getXebokiClient(resolved.apiKey);
  try {
    const outcome = await client.ordering.createBlogComment(params.slug, {
      body: payload.body,
      authorName: signedIn?.name ?? payload.authorName,
      authorEmail: signedIn?.email ?? payload.authorEmail,
      parentId: payload.parentId,
      website: payload.website,
    });
    return NextResponse.json(outcome, { status: 201 });
  } catch (err: unknown) {
    // The server's own words — "This shop asks readers to sign in before
    // commenting", "Comments on this post closed 14 days after it was
    // published". A generic failure here would replace a sentence that
    // tells somebody what to do with one that does not.
    const message = err instanceof Error ? err.message : 'Could not post that comment';
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
