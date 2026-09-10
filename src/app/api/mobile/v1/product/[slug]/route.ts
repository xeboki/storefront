import { NextRequest, NextResponse } from 'next/server';
import { loadProduct } from '@/lib/sdk/store';
import { requireMobile, isResponse } from '@/lib/mobile/context';

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const ctx = await requireMobile(req);
  if (isResponse(ctx)) return ctx;
  const product = await loadProduct(ctx.store.apiKey, params.slug);
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  return NextResponse.json(product);
}
