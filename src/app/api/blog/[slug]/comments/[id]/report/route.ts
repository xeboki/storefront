/**
 * POST /api/blog/[slug]/comments/[id]/report — a reader raises a comment.
 *
 * Through the server for the same reason the rest is: the shop's API key
 * stays here. No session is required — a reader who has not signed in is
 * exactly the person most likely to be the one who noticed.
 *
 * Answers 202 and nothing else, always, whatever the API said. A reply
 * that varied would let anybody probe which comments are near being pulled,
 * and would tell somebody their own report landed, which is an invitation
 * to send more.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { loadStore } from '@/lib/sdk/store';
import { getXebokiClient } from '@/lib/sdk/client';

const Body = z.object({ storeSlug: z.string().min(1) });
const accepted = NextResponse.json({ ok: true }, { status: 202 });

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { storeSlug } = Body.parse(await req.json());
    const resolved = await loadStore(storeSlug);
    if (!resolved) return accepted;
    await getXebokiClient(resolved.apiKey).ordering.reportBlogComment(params.id);
  } catch {
    // Even a failure answers 202. A reader is not owed a diagnosis of the
    // shop's database, and nothing they did has gone wrong.
  }
  return NextResponse.json({ ok: true }, { status: 202 });
}
