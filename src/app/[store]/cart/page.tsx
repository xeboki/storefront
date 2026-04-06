/**
 * Cart page — purely client-side (cart state lives in Zustand).
 * RSC shell that renders the client cart component.
 */
import { CartView } from '@/components/cart/CartView';

interface Props {
  params: { store: string };
}

export default function CartPage({ params }: Props) {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Your Cart</h1>
      <CartView storeSlug={params.store} />
    </div>
  );
}
