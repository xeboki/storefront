import {
  BadgeCheck, Clock, CreditCard, Gift, Headphones, Leaf, Lock, Package,
  RotateCcw, ShieldCheck, Sparkles, Truck, type LucideIcon,
} from 'lucide-react';
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
/**
 * Icons a merchant can name. Anything else falls back to the badge rather than
 * leaving a hole where an icon should be — a typo in a CMS field should not
 * break the band.
 */
const ICONS: Record<string, LucideIcon> = {
  truck: Truck, delivery: Truck, shipping: Truck,
  badge: BadgeCheck, genuine: BadgeCheck, verified: BadgeCheck,
  returns: RotateCcw, refund: RotateCcw,
  support: Headphones, help: Headphones, contact: Headphones,
  secure: Lock, payment: CreditCard, card: CreditCard,
  shield: ShieldCheck, warranty: ShieldCheck,
  gift: Gift, eco: Leaf, sustainable: Leaf,
  clock: Clock, fast: Clock, package: Package, quality: Sparkles,
};

export function TrustBar({ storefrontConfig, currency }: Props) {
  const threshold = storefrontConfig?.freeShippingThreshold ?? null;
  const shippingCopy =
    threshold != null
      ? `On orders over ${formatCurrency(threshold, currency)}`
      : storefrontConfig?.shippingEnabled
      ? 'Delivery and click & collect'
      : 'Click & collect available';

  // The merchant's own wording wins. When they have set none, these are the
  // defaults — and the delivery line is still read from their real shipping
  // rules rather than written here, so the band cannot promise something
  // checkout will not honour.
  const custom = storefrontConfig?.trustItems ?? [];
  const items = custom.length > 0
    ? custom.map((item) => ({
        Icon: ICONS[item.icon?.toLowerCase()] ?? BadgeCheck,
        title: item.title,
        body: item.body,
      }))
    : [
        { Icon: Truck, title: threshold != null ? 'Free delivery' : 'Delivery options', body: shippingCopy },
        { Icon: BadgeCheck, title: 'Genuine stock', body: 'Sold and fulfilled by the store' },
        { Icon: RotateCcw, title: 'Easy returns', body: 'Request a return from your order' },
        { Icon: Headphones, title: 'Real people', body: 'Talk to the shop directly' },
      ];

  return (
    <section className="border-y border-line bg-surface-alt/60">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-6 gap-y-8 px-4 py-8 sm:px-6 sm:py-10 lg:grid-cols-4 lg:px-8">
        {items.map(({ Icon, title, body }, i) => (
          <div key={`${title}-${i}`} className="flex items-start gap-3">
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
