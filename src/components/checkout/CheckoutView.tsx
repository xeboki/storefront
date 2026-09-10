'use client';

import { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { clsx } from 'clsx';
import { Tag, Gift, ChevronDown, ChevronUp, Utensils } from 'lucide-react';
import { useCartStore } from '@/stores/cartStore';
import { useAuthStore } from '@/stores/authStore';
import { useStoreConfigStore, TABLE_TYPES } from '@/stores/storeConfigStore';
import { formatCurrency } from '@/lib/utils';
import { computeShipping } from '@/lib/shipping';
import { trackBeginCheckout } from '@/lib/analytics';
import type { StorefrontConfig } from '@xeboki/sdk';
import { CheckoutForm } from './CheckoutForm';
import { PayPalPaymentPanel } from './PayPalPaymentPanel';
import { CodPaymentPanel } from './CodPaymentPanel';

// ── Types ─────────────────────────────────────────────────────────────────────

type DeliveryType = 'pickup' | 'delivery' | 'dineIn';
type PaymentMethodType = 'stripe' | 'paypal' | 'cod';

interface StripeState {
  clientSecret: string;
  publishableKey: string;
  orderId: string;
}

interface PayPalState {
  paypalOrderId: string;
  xebokiOrderId: string;
  clientId: string;
  amount: number;
  currency: string;
}

interface DiscountState {
  code: string;
  type: string | null;
  value: number | null;
  discountAmount: number | null;
}

interface GiftCardState {
  id: string;
  code: string;
  balance: number;
  currency: string;
}

interface TableInfo {
  id: string;
  name: string;
}

// Module-level Stripe singleton
let stripePromise: ReturnType<typeof loadStripe> | null = null;

// ── Payment method config ──────────────────────────────────────────────────────

const PAYMENT_METHODS: Array<{
  id: PaymentMethodType;
  label: string;
  description: string;
  icon: string;
}> = [
  { id: 'stripe', label: 'Card', description: 'Credit / debit card, Google Pay, Apple Pay', icon: '💳' },
  { id: 'paypal', label: 'PayPal', description: 'Pay with your PayPal account', icon: '🅿️' },
  { id: 'cod', label: 'Pay later', description: 'Cash on delivery or pay at pickup', icon: '💵' },
];

// ── Main component ─────────────────────────────────────────────────────────────

interface Props {
  storeSlug: string;
  storefrontConfig: StorefrontConfig | null;
}

export function CheckoutView({ storeSlug, storefrontConfig }: Props) {
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.subtotal());
  const customer = useAuthStore((s) => s.customer);
  const businessType = useStoreConfigStore((s) => s.businessType);

  const isTableBusiness = TABLE_TYPES.has(businessType);

  // Guest contact
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');

  // Fulfillment
  const [deliveryType, setDeliveryType] = useState<DeliveryType>(isTableBusiness ? 'dineIn' : 'pickup');
  const [notes, setNotes] = useState('');
  const [tableNumber, setTableNumber] = useState('');

  // Discount
  const [discountCode, setDiscountCode] = useState('');
  const [discountState, setDiscountState] = useState<DiscountState | null>(null);
  const [discountLoading, setDiscountLoading] = useState(false);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [showDiscount, setShowDiscount] = useState(false);

  // Gift card
  const [giftCardCode, setGiftCardCode] = useState('');
  const [giftCardState, setGiftCardState] = useState<GiftCardState | null>(null);
  const [giftCardLoading, setGiftCardLoading] = useState(false);
  const [giftCardError, setGiftCardError] = useState<string | null>(null);
  const [showGiftCard, setShowGiftCard] = useState(false);

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('stripe');

  // State after initiating checkout
  const [stripeState, setStripeState] = useState<StripeState | null>(null);
  const [paypalState, setPaypalState] = useState<PayPalState | null>(null);
  const [codItems, setCodItems] = useState<typeof items | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Computed totals ──────────────────────────────────────────────────────────

  const discountAmount = discountState?.discountAmount ?? 0;
  const goods = Math.max(0, subtotal - discountAmount);
  // Delivery is charged on the discounted goods; pickup/dine-in are free.
  const shipping = computeShipping(deliveryType, goods, storefrontConfig);
  const giftCardApplied = giftCardState ? Math.min(giftCardState.balance, goods + shipping) : 0;
  const orderTotal = Math.max(0, goods + shipping - giftCardApplied);

  // GA4/Meta begin_checkout — once, when the checkout mounts with items.
  useEffect(() => {
    if (items.length === 0) return;
    trackBeginCheckout(
      items.map((i) => ({ id: i.productId, name: i.name, price: i.price, quantity: i.quantity })),
      subtotal,
      useStoreConfigStore.getState().currencyCode,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Guards ──────────────────────────────────────────────────────────────────

  if (items.length === 0) {
    return (
      <p className="text-center text-slate-500 py-16">
        Your cart is empty.{' '}
        <a href={`/${storeSlug}/catalog`} className="text-primary hover:underline">
          Go shopping
        </a>
      </p>
    );
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const isGuest = !customer;
  const guestValid = !isGuest || (guestName.trim().length > 0 && guestEmail.trim().length > 0);

  function cartPayload() {
    return items.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      modifiers: item.modifiers.length > 0
        ? item.modifiers.map((id) => ({ modifierId: id }))
        : undefined,
      notes: item.notes,
    }));
  }

  function sharedBody() {
    const resolvedDeliveryType = deliveryType === 'dineIn' ? 'dineIn' : deliveryType;
    return {
      storeSlug,
      items: cartPayload(),
      deliveryType: resolvedDeliveryType,
      notes: notes || undefined,
      customerId: customer?.customerId,
      guestName: isGuest ? guestName.trim() : undefined,
      guestEmail: isGuest ? guestEmail.trim() : undefined,
      tableId: deliveryType === 'dineIn' && tableNumber ? tableNumber : undefined,
      discountCode: discountState ? discountCode : undefined,
      giftCardCode: giftCardState ? giftCardCode : undefined,
      shippingAmount: shipping > 0 ? shipping : undefined,
    };
  }

  // ── Discount application ──────────────────────────────────────────────────────

  async function applyDiscount() {
    if (!discountCode.trim()) return;
    setDiscountLoading(true);
    setDiscountError(null);

    const res = await fetch('/api/checkout/discount', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeSlug, code: discountCode.trim(), orderTotal: subtotal }),
    });

    setDiscountLoading(false);

    const data = await res.json();
    if (!res.ok || !data.valid) {
      setDiscountError(data.reason ?? data.error ?? 'Invalid discount code');
      setDiscountState(null);
      return;
    }

    setDiscountState({
      code: discountCode.trim(),
      type: data.type,
      value: data.value,
      discountAmount: data.discountAmount ?? 0,
    });
  }

  function removeDiscount() {
    setDiscountState(null);
    setDiscountCode('');
    setDiscountError(null);
  }

  // ── Gift card application ─────────────────────────────────────────────────────

  async function applyGiftCard() {
    if (!giftCardCode.trim()) return;
    setGiftCardLoading(true);
    setGiftCardError(null);

    const res = await fetch('/api/checkout/giftcard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeSlug, code: giftCardCode.trim() }),
    });

    setGiftCardLoading(false);

    const data = await res.json();
    if (!res.ok) {
      setGiftCardError(data.error ?? 'Invalid gift card');
      setGiftCardState(null);
      return;
    }

    setGiftCardState({
      id: data.id,
      code: data.code,
      balance: data.balance,
      currency: data.currency,
    });
  }

  function removeGiftCard() {
    setGiftCardState(null);
    setGiftCardCode('');
    setGiftCardError(null);
  }

  // ── Initiate payment ─────────────────────────────────────────────────────────

  async function handleContinue() {
    if (!guestValid) {
      setError('Please enter your name and email to continue.');
      return;
    }

    setLoading(true);
    setError(null);

    if (paymentMethod === 'stripe') {
      await initiateStripe();
    } else if (paymentMethod === 'paypal') {
      await initiatePayPal();
    } else {
      setCodItems(items);
      setLoading(false);
    }
  }

  async function initiateStripe() {
    const res = await fetch('/api/checkout/payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sharedBody()),
    });

    setLoading(false);

    if (!res.ok) {
      const { error: msg } = await res.json();
      setError(msg ?? 'Failed to initialize payment');
      return;
    }

    const data = await res.json();

    if (!stripePromise) {
      stripePromise = loadStripe(data.publishableKey);
    }

    setStripeState({
      clientSecret: data.clientSecret,
      publishableKey: data.publishableKey,
      orderId: data.orderId,
    });
  }

  async function initiatePayPal() {
    const res = await fetch('/api/checkout/paypal/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sharedBody()),
    });

    setLoading(false);

    if (!res.ok) {
      const { error: msg } = await res.json();
      setError(msg ?? 'Failed to initialize PayPal');
      return;
    }

    const data = await res.json();
    setPaypalState(data as PayPalState);
  }

  // ── Render active payment panel ──────────────────────────────────────────────

  if (stripeState) {
    return (
      <Elements
        stripe={stripePromise}
        options={{ clientSecret: stripeState.clientSecret, appearance: { theme: 'stripe' } }}
      >
        <CheckoutForm storeSlug={storeSlug} orderId={stripeState.orderId} />
      </Elements>
    );
  }

  if (paypalState) {
    return (
      <div className="max-w-md mx-auto">
        <_OrderSummary items={items} subtotal={subtotal} discountAmount={discountAmount} shipping={shipping} giftCardApplied={giftCardApplied} orderTotal={orderTotal} />
        <div className="mt-6">
          <PayPalPaymentPanel
            storeSlug={storeSlug}
            clientId={paypalState.clientId}
            paypalOrderId={paypalState.paypalOrderId}
            xebokiOrderId={paypalState.xebokiOrderId}
            currency={paypalState.currency}
          />
        </div>
      </div>
    );
  }

  if (codItems) {
    return (
      <div className="max-w-md mx-auto">
        <_OrderSummary items={codItems} subtotal={subtotal} discountAmount={discountAmount} shipping={shipping} giftCardApplied={giftCardApplied} orderTotal={orderTotal} />
        <div className="mt-6">
          <CodPaymentPanel
            storeSlug={storeSlug}
            total={orderTotal}
            items={cartPayload()}
            customerId={customer?.customerId}
            guestName={isGuest ? guestName.trim() : undefined}
            guestEmail={isGuest ? guestEmail.trim() : undefined}
            deliveryType={deliveryType}
            notes={notes || undefined}
            tableId={deliveryType === 'dineIn' && tableNumber ? tableNumber : undefined}
            discountCode={discountState ? discountCode : undefined}
            giftCardCode={giftCardState ? giftCardCode : undefined}
            shippingAmount={shipping}
          />
        </div>
      </div>
    );
  }

  // ── Checkout form ────────────────────────────────────────────────────────────

  const fulfillmentOptions: Array<{ key: DeliveryType; label: string }> = [
    ...(isTableBusiness ? [{ key: 'dineIn' as DeliveryType, label: 'Dine In' }] : []),
    { key: 'pickup', label: 'Store Pickup' },
    { key: 'delivery', label: 'Delivery' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
      {/* Left: form */}
      <div className="lg:col-span-3 space-y-8">

        {/* 1 — Contact */}
        <section>
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
            Contact
          </h2>

          {customer ? (
            <div className="flex items-center gap-3 p-4 rounded-brand border border-slate-200 bg-slate-50">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                {customer.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{customer.name}</p>
                <p className="text-xs text-slate-500 truncate">{customer.email}</p>
              </div>
              <span className="text-xs text-emerald-600 font-medium bg-emerald-50 border border-emerald-200 rounded px-2 py-0.5">
                Signed in
              </span>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2 text-sm text-slate-500 mb-1">
                <span>Checking out as guest.</span>
                <a
                  href={`/${storeSlug}/login?next=/${storeSlug}/checkout`}
                  className="text-primary hover:underline font-medium"
                >
                  Sign in instead
                </a>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Full name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Jane Smith"
                    className="w-full px-3 py-2 border border-slate-200 rounded-brand text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="jane@example.com"
                    className="w-full px-3 py-2 border border-slate-200 rounded-brand text-sm focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>
          )}
        </section>

        {/* 2 — Fulfillment */}
        <section>
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
            Fulfillment
          </h2>
          <div className={`grid grid-cols-${fulfillmentOptions.length} gap-3`}>
            {fulfillmentOptions.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setDeliveryType(key)}
                className={clsx(
                  'py-2.5 px-4 rounded-brand border text-sm font-medium transition-colors',
                  deliveryType === key
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-surface text-slate-700 border-slate-200 hover:border-primary',
                )}
              >
                {key === 'dineIn' && <Utensils size={12} className="inline mr-1.5" />}
                {label}
              </button>
            ))}
          </div>

          {/* Table number for dine-in */}
          {deliveryType === 'dineIn' && (
            <div className="mt-3">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Table number <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                placeholder="e.g. Table 4"
                className="w-full px-3 py-2 border border-slate-200 rounded-brand text-sm focus:outline-none focus:border-primary"
              />
            </div>
          )}

          <div className="mt-3">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Order notes <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Special instructions…"
              className="w-full px-3 py-2 border border-slate-200 rounded-brand text-sm focus:outline-none focus:border-primary resize-none"
            />
          </div>
        </section>

        {/* 3 — Discount code */}
        <section>
          <button
            onClick={() => setShowDiscount(!showDiscount)}
            className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-primary transition-colors"
          >
            <Tag size={14} />
            Have a discount code?
            {showDiscount ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showDiscount && (
            <div className="mt-3">
              {discountState ? (
                <div className="flex items-center justify-between p-3 rounded-brand bg-emerald-50 border border-emerald-200 text-sm">
                  <div>
                    <span className="font-semibold text-emerald-800">{discountState.code}</span>
                    <span className="text-emerald-700 ml-2">
                      −{formatCurrency(discountState.discountAmount ?? 0)}
                    </span>
                  </div>
                  <button onClick={removeDiscount} className="text-emerald-600 hover:text-rose-600 transition-colors text-xs font-medium">
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && applyDiscount()}
                    placeholder="DISCOUNT CODE"
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-brand text-sm focus:outline-none focus:border-primary uppercase"
                  />
                  <button
                    onClick={applyDiscount}
                    disabled={discountLoading || !discountCode.trim()}
                    className="px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-brand hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    {discountLoading ? '…' : 'Apply'}
                  </button>
                </div>
              )}
              {discountError && <p className="text-xs text-rose-600 mt-1.5">{discountError}</p>}
            </div>
          )}
        </section>

        {/* 4 — Gift card */}
        <section>
          <button
            onClick={() => setShowGiftCard(!showGiftCard)}
            className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-primary transition-colors"
          >
            <Gift size={14} />
            Have a gift card?
            {showGiftCard ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showGiftCard && (
            <div className="mt-3">
              {giftCardState ? (
                <div className="flex items-center justify-between p-3 rounded-brand bg-violet-50 border border-violet-200 text-sm">
                  <div>
                    <span className="font-semibold text-violet-800">{giftCardState.code}</span>
                    <span className="text-violet-700 ml-2">
                      Balance: {formatCurrency(giftCardState.balance)} · Applying {formatCurrency(giftCardApplied)}
                    </span>
                  </div>
                  <button onClick={removeGiftCard} className="text-violet-600 hover:text-rose-600 transition-colors text-xs font-medium">
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={giftCardCode}
                    onChange={(e) => setGiftCardCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && applyGiftCard()}
                    placeholder="GIFT CARD CODE"
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-brand text-sm focus:outline-none focus:border-primary uppercase"
                  />
                  <button
                    onClick={applyGiftCard}
                    disabled={giftCardLoading || !giftCardCode.trim()}
                    className="px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-brand hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    {giftCardLoading ? '…' : 'Apply'}
                  </button>
                </div>
              )}
              {giftCardError && <p className="text-xs text-rose-600 mt-1.5">{giftCardError}</p>}
            </div>
          )}
        </section>

        {/* 5 — Payment method */}
        <section>
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
            Payment method
          </h2>
          <div className="space-y-2">
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m.id}
                onClick={() => setPaymentMethod(m.id)}
                className={clsx(
                  'w-full flex items-center gap-3 p-4 rounded-brand border text-left transition-colors',
                  paymentMethod === m.id
                    ? 'border-primary bg-primary/5'
                    : 'border-slate-200 bg-surface hover:border-slate-300',
                )}
              >
                <span className={clsx(
                  'w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center',
                  paymentMethod === m.id ? 'border-primary' : 'border-slate-300',
                )}>
                  {paymentMethod === m.id && <span className="w-2 h-2 rounded-full bg-primary block" />}
                </span>

                <span className="text-lg">{m.icon}</span>

                <span className="flex-1 min-w-0">
                  <span className={clsx(
                    'block text-sm font-semibold',
                    paymentMethod === m.id ? 'text-primary' : 'text-slate-900',
                  )}>
                    {m.label}
                  </span>
                  <span className="block text-xs text-slate-500">{m.description}</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <button
          onClick={handleContinue}
          disabled={loading}
          className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-brand hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {loading
            ? 'Preparing…'
            : paymentMethod === 'cod'
            ? 'Review Order'
            : 'Continue to Payment'}
        </button>
      </div>

      {/* Right: order summary */}
      <div className="lg:col-span-2">
        <_OrderSummary items={items} subtotal={subtotal} discountAmount={discountAmount} shipping={shipping} giftCardApplied={giftCardApplied} orderTotal={orderTotal} sticky />
      </div>
    </div>
  );
}

// ── Order summary widget ──────────────────────────────────────────────────────

interface OrderSummaryProps {
  items: Array<{
    productId: string;
    variantId?: string;
    name: string;
    variantLabel?: string;
    price: number;
    quantity: number;
  }>;
  subtotal: number;
  discountAmount: number;
  shipping: number;
  giftCardApplied: number;
  orderTotal: number;
  sticky?: boolean;
}

function _OrderSummary({ items, subtotal, discountAmount, shipping, giftCardApplied, orderTotal, sticky }: OrderSummaryProps) {
  return (
    <div className={clsx('rounded-brand border border-slate-200 p-5 space-y-4', sticky && 'sticky top-24')}>
      <h2 className="font-bold text-slate-900">Order Summary</h2>
      <ul className="divide-y divide-slate-100 text-sm">
        {items.map((item) => (
          <li key={`${item.productId}::${item.variantId ?? ''}`} className="flex justify-between gap-2 py-2">
            <span className="text-slate-700 flex-1 min-w-0 truncate">
              {item.name}
              {item.variantLabel && <span className="text-slate-400"> ({item.variantLabel})</span>}
              <span className="text-slate-400"> × {item.quantity}</span>
            </span>
            <span className="font-medium text-slate-900 whitespace-nowrap">
              {formatCurrency(item.price * item.quantity)}
            </span>
          </li>
        ))}
      </ul>

      <div className="space-y-1.5 text-sm border-t border-slate-100 pt-3">
        <div className="flex justify-between text-slate-600">
          <span>Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        {discountAmount > 0 && (
          <div className="flex justify-between text-emerald-600">
            <span>Discount</span>
            <span>−{formatCurrency(discountAmount)}</span>
          </div>
        )}
        <div className="flex justify-between text-slate-600">
          <span>Shipping</span>
          <span>{shipping > 0 ? formatCurrency(shipping) : 'Free'}</span>
        </div>
        {giftCardApplied > 0 && (
          <div className="flex justify-between text-violet-600">
            <span>Gift card</span>
            <span>−{formatCurrency(giftCardApplied)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-slate-900 text-base border-t border-slate-100 pt-2 mt-1">
          <span>Total</span>
          <span>{formatCurrency(orderTotal)}</span>
        </div>
      </div>
    </div>
  );
}
