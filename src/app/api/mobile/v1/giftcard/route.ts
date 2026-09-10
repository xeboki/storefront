import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireMobile, isResponse } from '@/lib/mobile/context';

const Body = z.object({ code: z.string().min(1) });

export async function POST(req: NextRequest) {
  const ctx = await requireMobile(req);
  if (isResponse(ctx)) return ctx;
  let body: z.infer<typeof Body>;
  try { body = Body.parse(await req.json()); }
  catch { return NextResponse.json({ error: 'code required' }, { status: 400 }); }
  const card = await ctx.client.ordering.getGiftCard(body.code);
  if (!card) return NextResponse.json({ error: 'Gift card not found' }, { status: 404 });
  return NextResponse.json(card);
}
