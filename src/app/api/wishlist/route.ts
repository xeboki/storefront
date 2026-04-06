/**
 * Wishlist is managed client-side via localStorage (see wishlistStore.ts).
 * This endpoint is a no-op stub kept for forward-compatibility.
 * Future: sync wishlist items to customer profile server-side.
 */
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ items: [] });
}
