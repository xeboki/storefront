import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireMobile, isResponse } from '@/lib/mobile/context';
const Body = z.object({ postcode: z.string().min(1), location: z.string().optional() });
export async function POST(req: NextRequest) {
  const ctx = await requireMobile(req); if (isResponse(ctx)) return ctx;
  let b: z.infer<typeof Body>;
  try { b = Body.parse(await req.json()); } catch { return NextResponse.json({ error: 'postcode required' }, { status: 400 }); }
  try { return NextResponse.json(await ctx.client.ordering.validatePostcode(b.postcode, { locationId: b.location })); }
  catch { return NextResponse.json({ valid: false }, { status: 422 }); }
}
