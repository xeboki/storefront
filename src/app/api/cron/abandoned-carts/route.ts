/**
 * GET /api/cron/abandoned-carts  — Vercel cron.
 *
 * For each configured store, finds carts idle past the threshold and sends one
 * recovery email, then marks them so they're not emailed twice. Protected by
 * CRON_SECRET. Multi-tenant: STOREFRONT_STORES lists the slugs to process
 * (comma-separated); without it there's nothing to do.
 */
import { NextRequest, NextResponse } from 'next/server';
import { loadStore } from '@/lib/sdk/store';
import { getXebokiClient } from '@/lib/sdk/client';
import { sendEmail } from '@/lib/email/mailer';
import { abandonedCartEmail } from '@/lib/email/templates';

const IDLE_MINUTES = Number(process.env.ABANDONED_CART_MINUTES ?? '60');
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://xeboki.store';

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const slugs = (process.env.STOREFRONT_STORES ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  let emailed = 0;
  const perStore: Record<string, number> = {};

  for (const slug of slugs) {
    const resolved = await loadStore(slug);
    if (!resolved) continue;
    const client = getXebokiClient(resolved.apiKey);
    try {
      const carts = await client.ordering.listAbandonedCarts({ minutes: IDLE_MINUTES });
      for (const cart of carts) {
        if (!cart.email) continue;
        const recoverUrl = `${BASE_URL.replace(/\/$/, '')}/${slug}/cart`;
        const { subject, html, text } = abandonedCartEmail(
          cart.items,
          cart.total,
          resolved.storeConfig,
          slug,
          recoverUrl,
        );
        const res = await sendEmail({ to: cart.email, subject, html, text });
        // Mark emailed regardless of provider config so an unconfigured store
        // doesn't re-list the same carts forever.
        await client.ordering.markAbandonedCart(cart.cartId, 'emailed');
        if (res.sent) emailed += 1;
      }
      perStore[slug] = carts.length;
    } catch {
      /* skip a failing store, keep the rest */
    }
  }

  return NextResponse.json({ ok: true, emailed, perStore });
}
