import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireMobile, isResponse } from '@/lib/mobile/context';

const Body = z.object({ code: z.string().min(1), orderTotal: z.number().optional() });

export async function POST(req: NextRequest) {
  const ctx = await requireMobile(req);
  if (isResponse(ctx)) return ctx;
  let body: z.infer<typeof Body>;
  try { body = Body.parse(await req.json()); }
  catch { return NextResponse.json({ error: 'code required' }, { status: 400 }); }
  const result = await ctx.client.ordering.validateDiscount(body.code, { orderTotal: body.orderTotal });
  return NextResponse.json(result);
}
