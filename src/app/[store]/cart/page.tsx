/**
 * Cart page — purely client-side (cart state lives in Zustand).
 * RSC shell that renders the client cart component.
 */
import { CartView } from '@/components/cart/CartView';
import { activeLocale } from '@/lib/i18n/server';
import { translate } from '@/lib/i18n';

interface Props {
  params: { store: string };
}

export default function CartPage({ params }: Props) {
  // The dictionary has carried 'cart.title' all along; the page never asked
  // for it, so the heading stayed English in every language.
  const locale = activeLocale();
  return (
    // Wider than it was: the basket is two columns now, not a narrow list.
    <div className="mx-auto max-w-7xl px-4 pb-24 pt-10 sm:px-6 lg:px-8 lg:pt-14">
      <header className="mb-10">
        <p className="eyebrow eyebrow-rule text-primary">Basket</p>
        <h1 className="display-lg mt-3 text-fg">{translate(locale, 'cart.title')}</h1>
      </header>
      <CartView storeSlug={params.store} />
    </div>
  );
}
