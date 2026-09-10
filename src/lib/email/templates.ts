/**
 * HTML + plain-text transactional email templates.
 *
 * Kept dependency-free (no MJML/React-email) so they render in any runtime and
 * stay legible in every mail client. Currency is formatted from the store's
 * own code, not hard-coded.
 */
import type { OrderingOrder, StoreConfig } from '@xeboki/sdk';

function money(amount: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode || 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currencyCode}`;
  }
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export interface OrderEmail {
  subject: string;
  html: string;
  text: string;
}

export function orderConfirmationEmail(
  order: OrderingOrder,
  storeConfig: StoreConfig,
  storeSlug: string,
  orderUrl: string,
): OrderEmail {
  const cur = storeConfig.currencyCode;
  const brand = storeConfig.businessName || storeSlug;
  const num = order.orderNumber || order.id;

  const rows = order.items
    .map(
      (it) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #eee;">
          ${esc(it.productName)}${it.variantLabel ? ` <span style="color:#888">(${esc(it.variantLabel)})</span>` : ''}
          <span style="color:#888"> × ${it.quantity}</span>
        </td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;">${money(it.totalPrice, cur)}</td>
      </tr>`,
    )
    .join('');

  const summaryRow = (label: string, value: string, bold = false) => `
      <tr>
        <td style="padding:4px 0;${bold ? 'font-weight:700;' : 'color:#555;'}">${label}</td>
        <td style="padding:4px 0;text-align:right;${bold ? 'font-weight:700;' : ''}">${value}</td>
      </tr>`;

  const html = `<!doctype html><html><body style="margin:0;background:#f6f7f9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111;">
    <div style="max-width:560px;margin:0 auto;padding:24px;">
      <div style="background:#fff;border-radius:12px;padding:28px;border:1px solid #eee;">
        <h1 style="margin:0 0 4px;font-size:20px;">Thanks for your order</h1>
        <p style="margin:0 0 20px;color:#555;">${esc(brand)} · Order #${esc(num)}</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">${rows}</table>
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:12px;">
          ${summaryRow('Subtotal', money(order.subtotal, cur))}
          ${order.discount > 0 ? summaryRow('Discount', `-${money(order.discount, cur)}`) : ''}
          ${order.tax > 0 ? summaryRow('Tax', money(order.tax, cur)) : ''}
          ${summaryRow('Total', money(order.total, cur), true)}
        </table>
        <a href="${orderUrl}" style="display:inline-block;margin-top:20px;background:#111;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px;">View your order</a>
        <p style="margin:20px 0 0;color:#888;font-size:12px;">If you have any questions, reply to this email${storeConfig.supportEmail ? ` or contact ${esc(storeConfig.supportEmail)}` : ''}.</p>
      </div>
      <p style="text-align:center;color:#aaa;font-size:12px;margin-top:16px;">${esc(brand)}</p>
    </div>
  </body></html>`;

  const text = [
    `Thanks for your order — ${brand}`,
    `Order #${num}`,
    '',
    ...order.items.map(
      (it) => `- ${it.productName}${it.variantLabel ? ` (${it.variantLabel})` : ''} x${it.quantity}  ${money(it.totalPrice, cur)}`,
    ),
    '',
    `Subtotal: ${money(order.subtotal, cur)}`,
    order.discount > 0 ? `Discount: -${money(order.discount, cur)}` : '',
    order.tax > 0 ? `Tax: ${money(order.tax, cur)}` : '',
    `Total: ${money(order.total, cur)}`,
    '',
    `View your order: ${orderUrl}`,
  ]
    .filter(Boolean)
    .join('\n');

  return { subject: `Order confirmed — #${num} · ${brand}`, html, text };
}
