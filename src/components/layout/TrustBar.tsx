import { BadgeCheck, Headphones, RotateCcw, Truck } from 'lucide-react';
import type { StorefrontConfig } from '@xeboki/sdk';
import { formatCurrency } from '@/lib/utils';

interface Props {
  storefrontConfig: StorefrontConfig | null;
  currency: string;
}

/**
 * The reassurance band under the hero.
 *
 * Every shop of this kind carries one, and it is not decoration: delivery
 * cost, returns and who to talk to are the three things a first-time buyer
 * looks for before they trust a name they do not know.
 *
 * The delivery line is read from the merchant's own shipping rules rather than
 * invented, so it cannot promise something checkout will not honour.
 */
export function TrustBar({ storefrontConfig, currency }: Props) {
  const threshold = storefrontConfig?.freeShippingThreshold ?? null;
  const shippingCopy =
    threshold != null
      ? `On orders over ${formatCurrency(threshold, currency)}`
      : storefrontConfig?.shippingEnabled
      ? 'Delivery and click & collect'
      : 'Click & collect available';

  const items = [
    { Icon: Truck, title: threshold != null ? 'Free delivery' : 'Delivery options', body: shippingCopy },
    { Icon: BadgeCheck, title: 'Genuine stock', body: 'Sold and fulfilled by the store' },
    { Icon: RotateCcw, title: 'Easy returns', body: 'Request a return from your order' },
    { Icon: Headphones, title: 'Real people', body: 'Talk to the shop directly' },
  ];

  return (
    <section className="border-y border-line bg-surface-alt/60">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-6 gap-y-8 px-4 py-10 sm:px-6 lg:grid-cols-4 lg:px-8">
        {items.map(({ Icon, title, body }) => (
          <div key={title} className="flex items-start gap-3">
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icon size={18} aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-fg">{title}</p>
              <p className="mt-0.5 text-sm text-fg-muted">{body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
