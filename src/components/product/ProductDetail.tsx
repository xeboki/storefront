'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { ShoppingCart, Plus, Minus, Heart } from 'lucide-react';
import { clsx } from 'clsx';
import { useCartStore } from '@/stores/cartStore';
import { useWishlistStore } from '@/stores/wishlistStore';
import { formatCurrency } from '@/lib/utils';
import { useCatalogDisplay } from '@/lib/storefront-config';
import { useMoney } from '@/lib/currency';
import { canBuy, variantIsSellable } from '@/lib/availability';
import { ProductImage } from './ProductImage';
import { trackViewItem, trackAddToCart } from '@/lib/analytics';
import { deliveryEstimateText } from '@/lib/delivery-estimate';
import type { DeliveryEstimate } from '@xeboki/sdk';
import { useStoreConfigStore } from '@/stores/storeConfigStore';
import { ProductReviews } from './ProductReviews';
import type { OrderingProduct, ProductVariant } from '@xeboki/sdk';

interface Props {
  product: OrderingProduct;
  storeSlug: string;
  /**
   * How long delivery takes, when the shop has said. Shown HERE and not only
   * at checkout: it is the one thing a shopper wants before they decide, and
   * the commonest reason a basket is abandoned is finding out too late.
   */
  deliveryEstimate?: DeliveryEstimate | null;
}

export function ProductDetail({ product, storeSlug, deliveryEstimate }: Props) {
  const delivery = deliveryEstimateText(deliveryEstimate);
  const money = useMoney();
  const variants: ProductVariant[] = product.hasVariants ? product.variants ?? [] : [];
  const axes = product.variantOptions ?? [];

  const { showPrices, showStock } = useCatalogDisplay();

  // Stock only limits a product that tracks it; an untracked item never sells out.
  const inStock = (v: ProductVariant) => variantIsSellable(product, v);

  // One chosen value per axis. A variation is a combination, so choosing "Navy"
  // after "M" has to keep M. Resolving each click to the first variation holding
  // that one value jumped a shopper to XS Navy.
  const [choice, setChoice] = useState<Record<string, string>>(() => {
    const first = variants.find(inStock) ?? variants[0];
    return first ? { ...first.attributes } : {};
  });
  const selectedVariant: ProductVariant | null =
    variants.find((v) => axes.every((axis) => v.attributes?.[axis.name] === choice[axis.name])) ??
    null;
  /// How many are left, when the shop tracks this product and says so.
  ///
  /// Null for an untracked product rather than zero: "0 in stock" on a
  /// service or a made-to-order piece is a lie, and a figure nobody counts
  /// should not be printed. The variation's own count wins when one is
  /// chosen, because that is what the shopper would be buying.
  const stockLeft: number | null = !product.trackInventory
    ? null
    : (selectedVariant?.stock ?? product.stockQuantity ?? null);

  const [selectedModifiers, setSelectedModifiers] = useState<Set<string>>(new Set());
  const [quantity, setQuantity] = useState(1);
  const addItem = useCartStore((s) => s.addItem);
  const addToWishlist = useWishlistStore((s) => s.addItem);
  const removeFromWishlist = useWishlistStore((s) => s.removeItem);
  const isWishlisted = useWishlistStore((s) =>
    s.isWishlisted(product.id, storeSlug, selectedVariant?.id),
  );

  // Variant price falls back to product price when null
  const activePrice =
    (product.hasVariants ? (selectedVariant?.price ?? product.price) : product.price) ?? 0;

  const activeImage =
    (product.hasVariants ? selectedVariant?.imageUrl ?? product.imageUrl : product.imageUrl) ??
    null;

  // Was `isActive && (!hasVariants || ...)`, so a product with no variations
  // never had its stock consulted at all.
  const isAvailable = canBuy(product, selectedVariant);

  // Fire GA4/Meta view_item once per product view.
  useEffect(() => {
    trackViewItem(
      { id: product.id, name: product.name, price: product.price ?? 0, category: product.categoryName },
      useStoreConfigStore.getState().currencyCode,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  function toggleModifier(id: string) {
    setSelectedModifiers((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleToggleWishlist() {
    if (isWishlisted) {
      removeFromWishlist(product.id, storeSlug, selectedVariant?.id);
      toast.success('Removed from wishlist');
    } else {
      addToWishlist({
        productId: product.id,
        variantId: selectedVariant?.id,
        name: product.name,
        price: activePrice,
        imageUrl: activeImage ?? undefined,
        storeSlug,
      });
      toast.success('Added to wishlist');
    }
  }

  function handleAddToCart() {
    if (product.hasVariants && !selectedVariant) {
      toast.error('Please select a variant');
      return;
    }

    const modifierLabels = product.modifierGroups
      ?.flatMap((g) => g.options)
      .filter((o) => selectedModifiers.has(o.id))
      .map((o) => o.name) ?? [];

    addItem({
      productId: product.id,
      variantId: selectedVariant?.id,
      name: product.name,
      variantLabel: selectedVariant?.label,
      imageUrl: activeImage ?? undefined,
      price: activePrice,
      quantity,
      modifiers: Array.from(selectedModifiers),
      modifierLabels,
    });
    trackAddToCart(
      { id: product.id, name: product.name, price: activePrice, quantity, category: product.categoryName },
      useStoreConfigStore.getState().currencyCode,
    );
    toast.success(`${product.name} added to cart`);
  }

  return (
    // The product panel and the reviews are siblings, so they need a wrapper.
    // Without one this file does not parse, and nothing in the storefront
    // builds — not this page, the whole app.
    <>
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
      {/* The gallery holds its own column and stays put while the details
          scroll: on a tall product page the image used to slide away and leave
          a shopper reading specifications about something they can no longer
          see. */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        {/* Square, not 4:5. A portrait crop on a half-width column ran to
            ~780px while the details beside it came to ~330, leaving a void
            that read as an unfinished page. */}
        <div className="relative aspect-square overflow-hidden rounded-brand-lg bg-surface-alt">
          <ProductImage
            src={activeImage}
            alt={product.name}
            fill
            className="object-cover"
            priority
            sizes="(max-width: 1024px) 100vw, 55vw"
            fallback={
              <div className="absolute inset-0 flex items-center justify-center text-fg-subtle/40">
                <ShoppingCart size={72} strokeWidth={1} />
              </div>
            }
          />
          {!isAvailable && (
            <span className="absolute start-4 top-4 bg-fg px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-bg">
              Sold out
            </span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="space-y-8">
        <div>
          {product.categoryName && (
            <p className="eyebrow eyebrow-rule text-primary">{product.categoryName}</p>
          )}
          <h1 className="display-lg mt-4 text-fg">{product.name}</h1>
          {showPrices ? (
            <p className="price mt-4 text-2xl font-medium text-fg">{money(activePrice)}</p>
          ) : (
            // A trade shop that does not publish prices still has to tell a
            // visitor what to do next, or the page just stops.
            <p className="mt-4 text-sm text-fg-muted">
              Price on request — get in touch and we will quote you.
            </p>
          )}
          {showStock && stockLeft !== null && stockLeft > 0 && (
            <p className="mt-2 text-sm text-fg-muted">
              {stockLeft} in stock
            </p>
          )}
        </div>

        {product.description && (
          <p className="max-w-prose leading-relaxed text-fg-muted">{product.description}</p>
        )}

        {/* Variants */}
        {variants.length > 0 && (
          <div className="space-y-3">
            {axes.map((axis) => (
              <div key={axis.name}>
                <p className="mb-3 flex items-baseline gap-2">
                  <span className="eyebrow text-[10px]">{axis.name}</span>
                  {choice[axis.name] && (
                    <span className="text-sm text-fg">{choice[axis.name]}</span>
                  )}
                </p>
                <div className="flex flex-wrap gap-2">
                  {axis.values.map((value) => {
                    const withValue = variants.filter((v) => v.attributes?.[axis.name] === value);
                    // The variation this value makes with every other axis as chosen.
                    const exact = withValue.find((v) =>
                      axes.every(
                        (other) =>
                          other.name === axis.name || v.attributes?.[other.name] === choice[other.name],
                      ),
                    );
                    // Struck out only when no variation with this value can be bought.
                    const outOfStock = !withValue.some(inStock);
                    const isSelected = choice[axis.name] === value;

                    return (
                      <button
                        key={value}
                        disabled={outOfStock}
                        onClick={() => {
                          // Keep the other choices when that combination can be
                          // bought; otherwise move to one that can.
                          const target = exact && inStock(exact) ? exact : withValue.find(inStock);
                          if (target) setChoice({ ...target.attributes });
                        }}
                        className={clsx(
                          'min-w-[3rem] px-4 py-2.5 border text-sm font-medium transition-colors',
                          isSelected
                            ? 'border-fg bg-fg text-bg'
                            : outOfStock
                            ? 'cursor-not-allowed border-line text-fg-subtle line-through'
                            : 'border-line text-fg hover:border-fg',
                        )}
                      >
                        {value}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modifier groups */}
        {product.modifierGroups?.map((group) => (
          <div key={group.id} className="space-y-2">
            <p className="text-sm font-semibold text-fg">
              {group.name}
              {group.required && <span className="text-danger-fg ms-1">*</span>}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {group.options.map((option) => (
                <button
                  key={option.id}
                  onClick={() => toggleModifier(option.id)}
                  className={clsx(
                    'flex items-center justify-between px-3 py-2 rounded-brand border text-sm transition-colors',
                    selectedModifiers.has(option.id)
                      ? 'bg-primary/10 border-primary text-primary font-medium'
                      : 'bg-surface border-line text-fg hover:border-line',
                  )}
                >
                  <span>{option.name}</span>
                  {option.priceAdjustment > 0 && (
                    <span className="text-xs text-fg-muted">+{money(option.priceAdjustment)}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Quantity + CTA. Hidden on a phone — the sticky bar below owns it
            there, because this one scrolls out of reach past the fold.

            Gone entirely when the shop does not publish prices: a basket
            cannot total something that has no price on it, and a checkout
            that asks for payment against a blank line is worse than no
            checkout. The enquiry line above the fold is the way through. */}
        {showPrices && (
        <div className="hidden sm:flex items-center gap-4 pt-2">
          <div className="flex h-12 items-center rounded-brand border border-line">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              aria-label="Decrease quantity"
              className="h-full px-4 text-fg-muted transition-colors hover:text-fg"
            >
              <Minus size={15} />
            </button>
            <span className="price min-w-[2.5ch] text-center text-sm font-medium text-fg">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              aria-label="Increase quantity"
              className="h-full px-4 text-fg-muted transition-colors hover:text-fg"
            >
              <Plus size={15} />
            </button>
          </div>

          <button
            onClick={handleAddToCart}
            disabled={!isAvailable}
            className={clsx(
              'flex h-12 flex-1 items-center justify-center gap-2 rounded-brand text-xs font-semibold uppercase tracking-[0.14em] transition-opacity',
              isAvailable
                ? 'bg-primary-solid text-primary-foreground hover:opacity-90'
                : 'cursor-not-allowed bg-surface-alt text-fg-subtle',
            )}
          >
            <ShoppingCart size={16} />
            {isAvailable ? 'Add to Cart' : 'Sold Out'}
          </button>

          <button
            onClick={handleToggleWishlist}
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            className={clsx(
              'p-3 rounded-brand border transition-colors',
              isWishlisted
                ? 'border-danger-border bg-danger-bg text-danger-fg'
                : 'border-line text-fg-subtle hover:border-danger-border hover:text-danger-fg',
            )}
          >
            <Heart size={20} className={isWishlisted ? 'fill-danger-fg' : ''} />
          </button>
        </div>
        )}

        {/* Phone: quantity stays in the flow, buying lives in the sticky bar. */}
        {showPrices && (
        <div className="flex sm:hidden items-center gap-4 pt-2">
          <div className="flex items-center border border-line rounded-brand overflow-hidden">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              aria-label="Decrease quantity"
              className="px-4 py-3 text-fg-muted hover:bg-surface-alt transition-colors"
            >
              <Minus size={16} />
            </button>
            <span className="px-4 py-3 text-fg font-medium min-w-[3ch] text-center">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              aria-label="Increase quantity"
              className="px-4 py-3 text-fg-muted hover:bg-surface-alt transition-colors"
            >
              <Plus size={16} />
            </button>
          </div>
          <button
            onClick={handleToggleWishlist}
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            className={clsx(
              'p-3 rounded-brand border transition-colors',
              isWishlisted
                ? 'border-danger-border bg-danger-bg text-danger-fg'
                : 'border-line text-fg-subtle hover:border-danger-border hover:text-danger-fg',
            )}
          >
            <Heart size={20} className={isWishlisted ? 'fill-danger-fg' : ''} />
          </button>
        </div>
        )}

        {/* Only what the record actually says. A PDP is where invented
            reassurance does the most damage — it is the last thing read before
            someone commits. */}
        <dl className="divide-y divide-line border-t border-line text-sm">
          {product.categoryName && (
            <div className="flex justify-between gap-4 py-3">
              <dt className="text-fg-muted">Category</dt>
              <dd className="text-fg">{product.categoryName}</dd>
            </div>
          )}
          {/* Only a variation carries a SKU on OrderingProduct — the API
              serves one for the product too, but the SDK type has never
              mapped it. */}
          {selectedVariant?.sku && (
            <div className="flex justify-between gap-4 py-3">
              <dt className="text-fg-muted">SKU</dt>
              <dd className="price text-fg">{selectedVariant.sku}</dd>
            </div>
          )}
          <div className="flex justify-between gap-4 py-3">
            <dt className="text-fg-muted">Availability</dt>
            <dd className={isAvailable ? 'text-fg' : 'text-fg-muted'}>
              {isAvailable ? 'In stock at your store' : 'Not available at your store'}
            </dd>
          </div>
          {/* Absent when the shop has never said. A delivery promise nobody
              made is worse than none, because a shopper holds you to it. */}
          {delivery && (
            <div className="flex justify-between gap-4 py-3">
              <dt className="text-fg-muted">Delivery</dt>
              <dd className="text-end text-fg">
                {delivery.range}
                {delivery.cutoff && (
                  <span className="block text-xs text-fg-muted">{delivery.cutoff}</span>
                )}
              </dd>
            </div>
          )}
        </dl>
      </div>
    </div>

    {/* Sticky buy bar — phones only. It carries the price so a shopper deep in
        the description still knows what they are about to pay, and it sits
        above the home indicator via safe-area padding.

        Absent when the shop does not publish prices. It is the one piece of
        buying chrome that follows a shopper down the page, so leaving it
        would have left a phone with a Add to Cart button over a blank price
        on a shop that cannot sell. */}
    {showPrices && (
    <div className="sm:hidden fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs text-fg-muted">{product.name}</p>
          <p className="font-semibold text-fg">{money(activePrice)}</p>
        </div>
        <button
          onClick={handleAddToCart}
          disabled={!isAvailable}
          className={clsx(
            'ms-auto flex h-12 flex-1 items-center justify-center gap-2 rounded-brand px-6 font-semibold transition-opacity',
            isAvailable
              ? 'bg-primary-solid text-primary-foreground hover:opacity-90'
              : 'bg-surface-alt text-fg-subtle cursor-not-allowed',
          )}
        >
          <ShoppingCart size={18} />
          {isAvailable ? 'Add to Cart' : 'Sold Out'}
        </button>
      </div>
    </div>
    )}

    {/* Reviews */}
    <div className="mt-12 border-t border-line pt-10">
      <ProductReviews storeSlug={storeSlug} productId={product.id} />
    </div>
    </>
  );
}
