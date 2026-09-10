/**
 * Sends the order-confirmation email for a placed order.
 *
 * One entry point for all three payment paths (Stripe confirm, PayPal capture,
 * COD). It re-reads the order so the email reflects what was actually stored
 * (discounted totals, resolved line items) rather than what the client claimed,
 * and it NEVER throws into the checkout — the sale stands whether or not the
 * mail sends. A missing recipient or unconfigured provider is a no-op.
 */
import type { XebokiClient } from '@xeboki/sdk';
import type { ResolvedStore } from '@/lib/sdk/store';
import { sendEmail } from './mailer';
import { orderConfirmationEmail } from './templates';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://xeboki.store';

export async function sendOrderConfirmation(
  client: XebokiClient,
  resolved: ResolvedStore,
  orderId: string,
): Promise<void> {
  try {
    const order = await client.ordering.getOrder(orderId);
    const to = order.customerEmail;
    if (!to) return;

    const orderUrl = `${BASE_URL.replace(/\/$/, '')}/${resolved.slug}/orders/${orderId}`;
    const { subject, html, text } = orderConfirmationEmail(
      order,
      resolved.storeConfig,
      resolved.slug,
      orderUrl,
    );

    await sendEmail({ to, subject, html, text, replyTo: resolved.storeConfig.supportEmail || undefined });
  } catch (err) {
    // Confirmation email is best-effort — log and move on.
    console.error(`[email] order confirmation failed for ${orderId}`, err);
  }
}
