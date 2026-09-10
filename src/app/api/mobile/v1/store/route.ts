import { NextRequest, NextResponse } from 'next/server';
import { requireMobile, isResponse } from '@/lib/mobile/context';

export async function GET(req: NextRequest) {
  const ctx = await requireMobile(req);
  if (isResponse(ctx)) return ctx;
  return NextResponse.json({ storeConfig: ctx.store.storeConfig, storefrontConfig: ctx.store.storefrontConfig });
}
