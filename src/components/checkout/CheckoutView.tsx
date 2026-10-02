'use client';

import { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { clsx } from 'clsx';
import { Tag, Gift, ChevronDown, ChevronUp, Utensils } from 'lucide-react';
import { useCartStore } from '@/stores/cartStore';
import { useAuthStore } from '@/stores/authStore';
import { useStoreConfigStore } from '@/stores/storeConfigStore';
import { hasTables } from '@/lib/business-type';
import { formatCurrency } from '@/lib/utils';
import { useMoney } from '@/lib/currency';
import {
  computeShippingForCity,
  resolveDeliveryLocation,
  pickupLocations,
  taxRateFor,
} from '@/lib/shipping';
import { trackBeginCheckout } from '@/lib/analytics';
import { deliveryEstimateText } from '@/lib/delivery-estimate';
import type { StorefrontConfig, StorePaymentMethod } from '@xeboki/sdk';
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

// Maps a configured method (the SINGLE SOURCE — the merchant's Payment Methods
// dialog) to the storefront's checkout handler. Capability map, not an enable
// list: WHICH methods show and in WHAT order is driven entirely by the config;
// this only says which flow can run each one, and returns null for a method the
// storefront has no handler for yet (so it is skipped rather than misrendered).
function methodHandler(pm: StorePaymentMethod): PaymentMethodType | null {
  if (pm.gateway === 'stripe') return 'stripe';
  if (pm.gateway === 'paypal') return 'paypal';
  if (pm.key === 'cod') return 'cod';
  return null;
}

// ── Main component ─────────────────────────────────────────────────────────────

interface LoyaltyOffer {
  points: number;
  redemptionThreshold: number;
  redemptionValue: number;
}

interface Props {
  paymentMethods?: StorePaymentMethod[];
  storeSlug: string;
  storefrontConfig: StorefrontConfig | null;
  loyalty: LoyaltyOffer | null;
  /**
   * The store the shopper has been browsing. Checkout used to pick whichever
   * pickup branch came first, so a basket filled at one branch could be
   * collected from another without a word.
   */
  shoppingAtLocationId?: string | null;
}

export function CheckoutView({
  storeSlug, storefrontConfig, paymentMethods = [], loyalty, shoppingAtLocationId = null,
}: Props) {
  const money = useMoney();
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.subtotal());
  const customer = useAuthStore((s) => s.customer);
  const businessType = useStoreConfigStore((s) => s.businessType);

  const isTableBusiness = hasTables(businessType);

  // Guest contact
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  // The details a shop can ask for on its Checkout tab. Eleven settings there
  // were written since it shipped and read by nothing — these four fields did
  // not exist on the form at all, so "require a VAT number" could not have
  // worked however it was read.
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Fulfillment
  const [deliveryType, setDeliveryType] = useState<DeliveryType>(isTableBusiness ? 'dineIn' : 'pickup');
  const [notes, setNotes] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  // City/location-based fulfillment: where to deliver, and which branch to collect from.
  const [deliveryCity, setDeliveryCity] = useState('');
  const _pickupBranches = pickupLocations(storefrontConfig);
  const [pickupLocationId, setPickupLocationId] = useState<string>(
    // Collect from the store they shopped at, if it takes collections.
    _pickupBranches.find((b) => b.locationId === shoppingAtLocationId)?.locationId
      ?? _pickupBranches[0]?.locationId
      ?? '',
  );

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

  // Loyalty redemption
  const [redeemLoyalty, setRedeemLoyalty] = useState(false);

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
  // City/location-based: the branch serving the buyer's city sets the fee.
  const deliveryBranch = resolveDeliveryLocation(deliveryCity, storefrontConfig);
  const shipping = computeShippingForCity(deliveryType, goods, deliveryCity, storefrontConfig);
  const billBeforeLoyalty = goods + shipping;

  // Fulfilling branch: the serving branch for delivery, the chosen branch for
  // pickup. Drives the order's location attribution and the tax rate shown.
  const pickupBranch = _pickupBranches.find((b) => b.locationId === pickupLocationId) ?? null;
  const fulfilBranch = deliveryType === 'delivery' ? deliveryBranch : pickupBranch;
  const fulfilLocationId = fulfilBranch?.locationId ?? '';

  // The basket was filled from one store's shelves. If a different store will
  // fulfil it — a delivery city another branch serves, or a collection point
  // they changed — say so, rather than let the stock they saw quietly stop
  // applying.
  // A branch's minimum order was shown on its page and enforced nowhere, so a
  // merchant's rule was decorative: a €15 minimum did not stop a €3.10 basket.
  // Measured against what the shopper pays for the goods, so a discount that
  // takes them under the line is caught too.
  const minOrder = deliveryType === 'delivery' ? (deliveryBranch?.minOrder ?? 0) : 0;
  const belowMinimum = minOrder > 0 && goods < minOrder;

  const shoppedAt = (storefrontConfig?.fulfillmentLocations ?? [])
    .find((l) => l.locationId === shoppingAtLocationId) ?? null;
  const fulfilledElsewhere =
    shoppedAt !== null &&
    fulfilBranch !== null &&
    fulfilBranch.locationId !== shoppedAt.locationId;
  // Tax rate is display-only — the charged total's tax comes from the POS.
  const taxRate = taxRateFor(fulfilBranch, storefrontConfig);
  const taxInclusive = storefrontConfig?.taxInclusive ?? false;

  // Payment options come from the SINGLE SOURCE — the merchant's Payment Methods
  // config (store config), mapped from each method's gateway to a checkout
  // handler, in the merchant's configured order. Nothing is hardcoded on here.
  // An unconfigured store (no method flagged available-online) falls back to the
  // built-in options so it can still take payment.
  const configuredIds: PaymentMethodType[] = [];
  for (const pm of paymentMethods) {
    const id = methodHandler(pm);
    if (id && !configuredIds.includes(id)) configuredIds.push(id);
  }
  const availablePaymentMethods = (configuredIds.length > 0
    ? configuredIds
    : PAYMENT_METHODS.map((m) => m.id))
    .map((id) => PAYMENT_METHODS.find((m) => m.id === id))
    .filter((m): m is (typeof PAYMENT_METHODS)[number] => m != null);
  // If the selected method isn't offered, fall back to the first available one.
  useEffect(() => {
    if (availablePaymentMethods.length > 0 &&
        !availablePaymentMethods.some((m) => m.id === paymentMethod)) {
      setPaymentMethod(availablePaymentMethods[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availablePaymentMethods.length]);

  // Loyalty points reduce the bill like a discount. Clamp to the balance AND to
  // the bill, and scale points to the discount, mirroring the API so the points
  // spent and the money saved always agree.
  const loyaltyPerPoint = loyalty ? loyalty.redemptionValue / loyalty.redemptionThreshold : 0;
  let loyaltyPointsRedeemed = 0;
  let loyaltyDiscount = 0;
  if (redeemLoyalty && loyalty && loyaltyPerPoint > 0) {
    const maxByBill = Math.floor(billBeforeLoyalty / loyaltyPerPoint);
    loyaltyPointsRedeemed = Math.min(loyalty.points, maxByBill);
    loyaltyDiscount = Math.round(loyaltyPointsRedeemed * loyaltyPerPoint * 100) / 100;
  }

  const giftCardApplied = giftCardState
    ? Math.min(giftCardState.balance, billBeforeLoyalty - loyaltyDiscount)
    : 0;
  const orderTotal = Math.max(0, billBeforeLoyalty - loyaltyDiscount - giftCardApplied);

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

  // Abandoned-cart capture — once a valid email is present, record the cart so
  // a recovery email can go out if they leave. Debounced, best-effort.
  const captureEmail = customer?.email ?? guestEmail;
  useEffect(() => {
    const email = (captureEmail ?? '').trim();
    if (items.length === 0 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return;
    const t = setTimeout(() => {
      fetch('/api/cart/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeSlug,
          email,
          total: subtotal,
          items: items.map((i) => ({ product_id: i.productId, product_name: i.name, quantity: i.quantity })),
        }),
        keepalive: true,
      }).catch(() => {});
    }, 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captureEmail, items.length]);

  // ── Guards ──────────────────────────────────────────────────────────────────

  if (items.length === 0) {
    return (
      <p className="text-center text-fg-muted py-16">
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

  const asks = storefrontConfig?.checkout;
  const deliveryDays = deliveryEstimateText(storefrontConfig?.deliveryEstimate);
  /** The extra details this shop requires, and whether each has been given. */
  const extraFields = [
    { key: 'phone', label: 'Phone', type: 'tel',
      required: asks?.requirePhone ?? false, value: phone, set: setPhone },
    { key: 'company', label: 'Company', type: 'text',
      required: asks?.requireCompany ?? false, value: company, set: setCompany },
    { key: 'vat', label: 'VAT number', type: 'text',
      required: asks?.requireVat ?? false, value: vatNumber, set: setVatNumber },
    { key: 'dob', label: 'Date of birth', type: 'date',
      required: asks?.requireDob ?? false, value: dateOfBirth, set: setDateOfBirth },
  ] as const;

  // The server refuses an order missing any of these, so the form must not
  // let a shopper reach that refusal having filled everything else in.
  const extrasValid = extraFields.every((f) => !f.required || f.value.trim().length > 0);
  const termsValid = !(asks?.showTerms ?? false) || termsAccepted;

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
      // Asked for because the shop said so, so they travel with the order —
      // collecting a VAT number and dropping it is worse than never asking.
      customerPhone: phone.trim() || undefined,
      company: company.trim() || undefined,
      vatNumber: vatNumber.trim() || undefined,
      dateOfBirth: dateOfBirth.trim() || undefined,
      tableId: deliveryType === 'dineIn' && tableNumber ? tableNumber : undefined,
      discountCode: discountState ? discountCode : undefined,
      giftCardCode: giftCardState ? giftCardCode : undefined,
      shippingAmount: shipping > 0 ? shipping : undefined,
      loyaltyPointsRedeemed: loyaltyPointsRedeemed > 0 ? loyaltyPointsRedeemed : undefined,
      // City/location-based routing: attribute the order to the fulfilling
      // branch and record the delivery city.
      fulfillmentLocationId: fulfilLocationId || undefined,
      deliveryCity: deliveryType === 'delivery' && deliveryCity.trim() ? deliveryCity.trim() : undefined,
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

    if (!extrasValid) {
      // Named, not "please complete the form": a shopper who has filled in
      // nine fields should not have to hunt for the tenth.
      const missing = extraFields
        .filter((f) => f.required && !f.value.trim())
        .map((f) => f.label.toLowerCase());
      setError(`This shop also needs your ${missing.join(' and ')}.`);
      return;
    }

    if (!termsValid) {
      setError('Please accept the terms to continue.');
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
        <_OrderSummary items={items} subtotal={subtotal} discountAmount={discountAmount} shipping={shipping} loyaltyDiscount={loyaltyDiscount} giftCardApplied={giftCardApplied} orderTotal={orderTotal} />
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
        <_OrderSummary items={codItems} subtotal={subtotal} discountAmount={discountAmount} shipping={shipping} loyaltyDiscount={loyaltyDiscount} giftCardApplied={giftCardApplied} orderTotal={orderTotal} />
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
            loyaltyPointsRedeemed={loyaltyPointsRedeemed > 0 ? loyaltyPointsRedeemed : undefined}
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
          <h2 className="eyebrow mb-4 border-b border-line pb-3 text-[10px]">
            Contact
          </h2>

          {customer ? (
            <div className="flex items-center gap-3 p-4 rounded-brand border border-line bg-surface-alt">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                {customer.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-fg truncate">{customer.name}</p>
                <p className="text-xs text-fg-muted truncate">{customer.email}</p>
              </div>
              <span className="text-xs text-success-fg font-medium bg-success-bg border border-success-border rounded px-2 py-0.5">
                Signed in
              </span>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2 text-sm text-fg-muted mb-1">
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
                  <label className="block text-xs font-medium text-fg-muted mb-1">
                    Full name <span className="text-danger-fg">*</span>
                  </label>
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Jane Smith"
                    className="w-full px-3 py-2 border border-line rounded-brand text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-fg-muted mb-1">
                    Email <span className="text-danger-fg">*</span>
                  </label>
                  <input
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="jane@example.com"
                    className="w-full px-3 py-2 border border-line rounded-brand text-sm focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>
          )}

          {/* What this shop asks for on top. Only the ones it asked for: a
              checkout that demands a VAT number of every shopper because one
              shop needs it is worse than the setting not existing. */}
          {extraFields.some((f) => f.required) && (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {extraFields.filter((f) => f.required).map((field) => (
                <div key={field.key}>
                  <label className="mb-1 block text-xs font-medium text-fg-muted">
                    {field.label} <span className="text-danger-fg">*</span>
                  </label>
                  <input
                    type={field.type}
                    value={field.value}
                    onChange={(e) => field.set(e.target.value)}
                    className="w-full rounded-brand border border-line px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 2 — Fulfillment */}
        <section>
          <h2 className="eyebrow mb-4 border-b border-line pb-3 text-[10px]">
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
                    ? 'bg-primary-solid text-primary-foreground border-primary'
                    : 'bg-surface text-fg border-line hover:border-primary',
                )}
              >
                {key === 'dineIn' && <Utensils size={12} className="inline me-1.5" />}
                {label}
              </button>
            ))}
          </div>

          {/* Delivery city (city/location-based routing) */}
          {/* Said again here, because the shopper chose delivery a moment
              ago and this is where they commit to it. */}
          {deliveryType === 'delivery' && deliveryDays && (
            <p className="mt-3 rounded-brand border border-info-border bg-info-bg px-3 py-2 text-xs text-info-fg">
              <span className="font-semibold">Arrives in {deliveryDays.range}.</span>
              {deliveryDays.cutoff && ` ${deliveryDays.cutoff} to start today.`}
            </p>
          )}

          {deliveryType === 'delivery' && (
            <div className="mt-3">
              <label className="block text-xs font-medium text-fg-muted mb-1">
                Delivery city / area
              </label>
              <input
                type="text"
                value={deliveryCity}
                onChange={(e) => setDeliveryCity(e.target.value)}
                placeholder="e.g. London"
                className="w-full px-3 py-2 border border-line rounded-brand text-sm focus:outline-none focus:border-primary"
              />
              {deliveryCity.trim() !== '' && (
                deliveryBranch ? (
                  <p className="text-xs text-success-fg mt-1.5">
                    Delivered from {deliveryBranch.locationName} · est.{' '}
                    {deliveryBranch.minDays}–{deliveryBranch.maxDays} days
                  </p>
                ) : (
                  <p className="text-xs text-warning-fg mt-1.5">
                    No branch delivers to “{deliveryCity.trim()}” — a standard delivery fee applies.
                  </p>
                )
              )}
            </div>
          )}

          {/* Pickup branch (click & collect) */}
          {deliveryType === 'pickup' && _pickupBranches.length > 0 && (
            <div className="mt-3">
              <label className="block text-xs font-medium text-fg-muted mb-1">
                Collect from
              </label>
              <select
                value={pickupLocationId}
                onChange={(e) => setPickupLocationId(e.target.value)}
                className="w-full px-3 py-2 border border-line rounded-brand text-sm bg-surface focus:outline-none focus:border-primary"
              >
                {_pickupBranches.map((b) => (
                  <option key={b.locationId} value={b.locationId}>
                    {b.locationName}
                    {b.city ? ` — ${b.city}` : ''}
                  </option>
                ))}
              </select>
              {pickupBranch?.pickupAddress && (
                <p className="text-xs text-fg-muted mt-1.5">{pickupBranch.pickupAddress}</p>
              )}
              {pickupBranch?.pickupInstructions && (
                <p className="text-xs text-fg-subtle mt-0.5">{pickupBranch.pickupInstructions}</p>
              )}
            </div>
          )}

          {fulfilledElsewhere && (
            <p className="mt-3 rounded-brand border border-warning-border bg-warning-bg px-3 py-2 text-xs text-warning-fg">
              You were shopping at{' '}
              <strong>{shoppedAt!.locationName || shoppedAt!.city}</strong>, but this
              order will be fulfilled by{' '}
              <strong>{fulfilBranch!.locationName || fulfilBranch!.city}</strong>.
              Availability and prices may differ.
            </p>
          )}

          {/* Table number for dine-in */}
          {deliveryType === 'dineIn' && (
            <div className="mt-3">
              <label className="block text-xs font-medium text-fg-muted mb-1">
                Table number <span className="text-fg-subtle font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                placeholder="e.g. Table 4"
                className="w-full px-3 py-2 border border-line rounded-brand text-sm focus:outline-none focus:border-primary"
              />
            </div>
          )}

          {/* A shop can turn the notes box off — a kitchen that cannot honour
              "no onions" is better not being asked. */}
          {(asks?.allowNotes ?? true) && (
          <div className="mt-3">
            <label className="block text-xs font-medium text-fg-muted mb-1">
              Order notes <span className="text-fg-subtle font-normal">(optional)</span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Special instructions…"
              className="w-full px-3 py-2 border border-line rounded-brand text-sm focus:outline-none focus:border-primary resize-none"
            />
          </div>
          )}

          {/* The terms box only appears when there is something to read: a box
              that cannot be honestly ticked is worse than no box. */}
          {asks?.showTerms && (
            <label className="mt-4 flex items-start gap-2.5 text-sm text-fg-muted">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-0.5 h-4 w-4 flex-shrink-0 accent-primary"
              />
              <span>
                I accept the{' '}
                <a
                  href={asks.termsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary underline"
                >
                  terms and conditions
                </a>
                .
              </span>
            </label>
          )}
        </section>

        {/* 3 — Discount code */}
        <section>
          <button
            onClick={() => setShowDiscount(!showDiscount)}
            className="flex items-center gap-2 text-sm font-medium text-fg-muted hover:text-primary transition-colors"
          >
            <Tag size={14} />
            Have a discount code?
            {showDiscount ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showDiscount && (
            <div className="mt-3">
              {discountState ? (
                <div className="flex items-center justify-between p-3 rounded-brand bg-success-bg border border-success-border text-sm">
                  <div>
                    <span className="font-semibold text-success-fg">{discountState.code}</span>
                    <span className="text-success-fg ms-2">
                      −{money(discountState.discountAmount ?? 0)}
                    </span>
                  </div>
                  <button onClick={removeDiscount} className="text-success-fg hover:text-danger-fg transition-colors text-xs font-medium">
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
                    className="flex-1 px-3 py-2 border border-line rounded-brand text-sm focus:outline-none focus:border-primary uppercase"
                  />
                  <button
                    onClick={applyDiscount}
                    disabled={discountLoading || !discountCode.trim()}
                    className="px-4 py-2 bg-primary-solid text-primary-foreground text-sm font-semibold rounded-brand hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    {discountLoading ? '…' : 'Apply'}
                  </button>
                </div>
              )}
              {discountError && <p className="text-xs text-danger-fg mt-1.5">{discountError}</p>}
            </div>
          )}
        </section>

        {/* 4 — Gift card */}
        <section>
          <button
            onClick={() => setShowGiftCard(!showGiftCard)}
            className="flex items-center gap-2 text-sm font-medium text-fg-muted hover:text-primary transition-colors"
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
                    <span className="text-violet-700 ms-2">
                      Balance: {money(giftCardState.balance)} · Applying {money(giftCardApplied)}
                    </span>
                  </div>
                  <button onClick={removeGiftCard} className="text-violet-600 hover:text-danger-fg transition-colors text-xs font-medium">
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
                    className="flex-1 px-3 py-2 border border-line rounded-brand text-sm focus:outline-none focus:border-primary uppercase"
                  />
                  <button
                    onClick={applyGiftCard}
                    disabled={giftCardLoading || !giftCardCode.trim()}
                    className="px-4 py-2 bg-primary-solid text-primary-foreground text-sm font-semibold rounded-brand hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    {giftCardLoading ? '…' : 'Apply'}
                  </button>
                </div>
              )}
              {giftCardError && <p className="text-xs text-danger-fg mt-1.5">{giftCardError}</p>}
            </div>
          )}
        </section>

        {loyalty && loyaltyPerPoint > 0 && (
          <section>
            <label className="flex items-start gap-3 p-4 rounded-brand border border-warning-border bg-warning-bg cursor-pointer">
              <input
                type="checkbox"
                checked={redeemLoyalty}
                onChange={(e) => setRedeemLoyalty(e.target.checked)}
                className="mt-0.5"
              />
              <span className="text-sm">
                <span className="font-semibold text-warning-fg">Use my loyalty points</span>
                <span className="block text-warning-fg">
                  You have {loyalty.points} points
                  {redeemLoyalty && loyaltyPointsRedeemed > 0
                    ? ` — redeeming ${loyaltyPointsRedeemed} for ${money(loyaltyDiscount)} off`
                    : ` (worth up to ${money(Math.round(loyalty.points * loyaltyPerPoint * 100) / 100)})`}
                </span>
              </span>
            </label>
          </section>
        )}

        {/* 5 — Payment method */}
        <section>
          <h2 className="eyebrow mb-4 border-b border-line pb-3 text-[10px]">
            Payment method
          </h2>
          <div className="space-y-2">
            {availablePaymentMethods.map((m) => (
              <button
                key={m.id}
                onClick={() => setPaymentMethod(m.id)}
                className={clsx(
                  'w-full flex items-center gap-3 p-4 rounded-brand border text-start transition-colors',
                  paymentMethod === m.id
                    ? 'border-primary bg-primary/5'
                    : 'border-line bg-surface hover:border-line',
                )}
              >
                <span className={clsx(
                  'w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center',
                  paymentMethod === m.id ? 'border-primary' : 'border-line',
                )}>
                  {paymentMethod === m.id && <span className="w-2 h-2 rounded-full bg-primary-solid block" />}
                </span>

                <span className="text-lg">{m.icon}</span>

                <span className="flex-1 min-w-0">
                  <span className={clsx(
                    'block text-sm font-semibold',
                    paymentMethod === m.id ? 'text-primary' : 'text-fg',
                  )}>
                    {m.label}
                  </span>
                  <span className="block text-xs text-fg-muted">{m.description}</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        {belowMinimum && deliveryBranch && (
          <p className="rounded-brand border border-warning-border bg-warning-bg px-3 py-2 text-sm text-warning-fg">
            {deliveryBranch.locationName || deliveryBranch.city} has a minimum
            delivery order of {money(minOrder)}. Add {money(minOrder - goods)}{' '}
            more to continue, or collect in store instead.
          </p>
        )}

        {error && <p className="text-sm text-danger-fg">{error}</p>}

        <button
          onClick={handleContinue}
          disabled={loading || belowMinimum}
          className="flex h-12 w-full items-center justify-center rounded-brand bg-primary-solid text-xs font-semibold uppercase tracking-[0.14em] text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
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
        <_OrderSummary items={items} subtotal={subtotal} discountAmount={discountAmount} shipping={shipping} loyaltyDiscount={loyaltyDiscount} giftCardApplied={giftCardApplied} orderTotal={orderTotal} taxRate={taxRate} taxInclusive={taxInclusive} sticky />
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
  loyaltyDiscount: number;
  giftCardApplied: number;
  orderTotal: number;
  taxRate?: number;
  taxInclusive?: boolean;
  sticky?: boolean;
}

function _OrderSummary({ items, subtotal, discountAmount, shipping, loyaltyDiscount, giftCardApplied, orderTotal, taxRate = 0, taxInclusive = false, sticky }: OrderSummaryProps) {
  const money = useMoney();
  return (
    <div
      className={clsx(
        'rounded-brand-lg border border-line bg-surface-alt/40 p-6 space-y-4',
        sticky && 'sticky top-24',
      )}
    >
      <p className="eyebrow text-[10px]">Order summary</p>
      <ul className="divide-y divide-line text-sm">
        {items.map((item) => (
          <li key={`${item.productId}::${item.variantId ?? ''}`} className="flex justify-between gap-2 py-2">
            <span className="text-fg flex-1 min-w-0 truncate">
              {item.name}
              {item.variantLabel && <span className="text-fg-subtle"> ({item.variantLabel})</span>}
              <span className="text-fg-subtle"> × {item.quantity}</span>
            </span>
            <span className="font-medium text-fg whitespace-nowrap">
              {money(item.price * item.quantity)}
            </span>
          </li>
        ))}
      </ul>

      <div className="space-y-1.5 text-sm border-t border-line pt-3">
        <div className="flex justify-between text-fg-muted">
          <span>Subtotal</span>
          <span>{money(subtotal)}</span>
        </div>
        {discountAmount > 0 && (
          <div className="flex justify-between text-success-fg">
            <span>Discount</span>
            <span>−{money(discountAmount)}</span>
          </div>
        )}
        <div className="flex justify-between text-fg-muted">
          <span>Shipping</span>
          <span>{shipping > 0 ? money(shipping) : 'Free'}</span>
        </div>
        {loyaltyDiscount > 0 && (
          <div className="flex justify-between text-warning-fg">
            <span>Loyalty points</span>
            <span>−{money(loyaltyDiscount)}</span>
          </div>
        )}
        {giftCardApplied > 0 && (
          <div className="flex justify-between text-violet-600">
            <span>Gift card</span>
            <span>−{money(giftCardApplied)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-fg text-base border-t border-line pt-2 mt-1">
          <span>Total</span>
          <span>{money(orderTotal)}</span>
        </div>
        {taxRate > 0 && (
          <p className="text-xs text-fg-subtle pt-0.5">
            {taxInclusive
              ? `Includes ${taxRate}% local tax`
              : `Plus ${taxRate}% local tax where applicable`}
          </p>
        )}
      </div>
    </div>
  );
}
