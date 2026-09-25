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
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 lg:pb-8">
      <h1 className="text-2xl font-bold text-fg mb-6">{translate(locale, 'cart.title')}</h1>
      <CartView storeSlug={params.store} />
    </div>
  );
}
