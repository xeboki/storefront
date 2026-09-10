/**
 * Provider-agnostic transactional mailer.
 *
 * The storefront never sent any email — no order confirmation, nothing — which
 * is the single biggest trust gap for a shop. This is server-only (called from
 * route handlers). It speaks Resend's HTTP API when RESEND_API_KEY is set, and
 * otherwise no-ops with a logged warning so a store without email configured
 * still checks out cleanly rather than 500-ing. Swap in SMTP/SES here later
 * behind the same interface without touching callers.
 *
 * Env:
 *   RESEND_API_KEY   — enables sending
 *   EMAIL_FROM       — verified sender, e.g. "Acme <orders@acme.com>"
 *   EMAIL_REPLY_TO   — optional
 */

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

export interface SendEmailResult {
  sent: boolean;
  id?: string;
  skipped?: 'not-configured' | 'no-recipient';
  error?: string;
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!input.to) return { sent: false, skipped: 'no-recipient' };

  if (!apiKey || !from) {
    // Not a failure — the store simply hasn't wired email yet.
    console.warn(
      `[email] RESEND_API_KEY/EMAIL_FROM not set — skipped "${input.subject}" to ${input.to}`,
    );
    return { sent: false, skipped: 'not-configured' };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
        reply_to: input.replyTo ?? process.env.EMAIL_REPLY_TO ?? undefined,
      }),
      cache: 'no-store',
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error(`[email] send failed ${res.status}: ${detail.slice(0, 300)}`);
      return { sent: false, error: `HTTP ${res.status}` };
    }

    const data = (await res.json().catch(() => ({}))) as { id?: string };
    return { sent: true, id: data.id };
  } catch (err) {
    console.error('[email] send threw', err);
    return { sent: false, error: err instanceof Error ? err.message : 'send failed' };
  }
}
