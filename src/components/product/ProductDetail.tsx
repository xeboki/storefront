'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { ShoppingCart, Plus, Minus, Heart } from 'lucide-react';
import { clsx } from 'clsx';
import { useCartStore } from '@/stores/cartStore';
import { useWishlistStore } from '@/stores/wishlistStore';
import { formatCurrency } from '@/lib/utils';
import { canBuy, variantIsSellable } from '@/lib/availability';
import { trackViewItem, trackAddToCart } from '@/lib/analytics';
import { useStoreConfigStore } from '@/stores/storeConfigStore';
import { ProductReviews } from './ProductReviews';
import type { OrderingProduct, ProductVariant } from '@xeboki/sdk';

interface Props {
  product: OrderingProduct;
  storeSlug: string;
}

export function ProductDetail({ product, storeSlug }: Props) {
  const variants: ProductVariant[] = product.hasVariants ? product.variants ?? [] : [];
  const axes = product.variantOptions ?? [];

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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
      {/* Image */}
      <div className="relative aspect-square rounded-brand overflow-hidden bg-surface-alt">
        {activeImage ? (
          <Image
            src={activeImage}
            alt={product.name}
            fill
            className="object-cover"
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-fg-subtle">
            <ShoppingCart size={80} />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-fg">{product.name}</h1>
          <p className="text-2xl font-bold text-primary mt-2">{formatCurrency(activePrice)}</p>
        </div>

        {product.description && (
          <p className="text-fg-muted leading-relaxed">{product.description}</p>
        )}

        {/* Variants */}
        {variants.length > 0 && (
          <div className="space-y-3">
            {axes.map((axis) => (
              <div key={axis.name}>
                <p className="text-sm font-semibold text-fg mb-2">{axis.name}</p>
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
                          'px-3 py-1.5 rounded-brand border text-sm font-medium transition-colors',
                          isSelected
                            ? 'bg-primary text-primary-foreground border-primary'
                            : outOfStock
                            ? 'bg-surface-alt text-fg-subtle border-line cursor-not-allowed line-through'
                            : 'bg-surface text-fg border-line hover:border-primary',
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
              {group.required && <span className="text-rose-500 ml-1">*</span>}
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
                    <span className="text-xs text-fg-muted">+{formatCurrency(option.priceAdjustment)}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Quantity + CTA. Hidden on a phone — the sticky bar below owns it
            there, because this one scrolls out of reach past the fold. */}
        <div className="hidden sm:flex items-center gap-4 pt-2">
          <div className="flex items-center border border-line rounded-brand overflow-hidden">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="px-3 py-2 text-fg-muted hover:bg-surface-alt transition-colors"
            >
              <Minus size={16} />
            </button>
            <span className="px-4 py-2 text-fg font-medium min-w-[3ch] text-center">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="px-3 py-2 text-fg-muted hover:bg-surface-alt transition-colors"
            >
              <Plus size={16} />
            </button>
          </div>

          <button
            onClick={handleAddToCart}
            disabled={!isAvailable}
            className={clsx(
              'flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-brand font-semibold transition-opacity',
              isAvailable
                ? 'bg-primary text-primary-foreground hover:opacity-90'
                : 'bg-surface-alt text-fg-subtle cursor-not-allowed',
            )}
          >
            <ShoppingCart size={18} />
            {isAvailable ? 'Add to Cart' : 'Sold Out'}
          </button>

          <button
            onClick={handleToggleWishlist}
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            className={clsx(
              'p-3 rounded-brand border transition-colors',
              isWishlisted
                ? 'border-rose-300 bg-rose-50 text-rose-500'
                : 'border-line text-fg-subtle hover:border-rose-300 hover:text-rose-500',
            )}
          >
            <Heart size={20} className={isWishlisted ? 'fill-rose-500' : ''} />
          </button>
        </div>

        {/* Phone: quantity stays in the flow, buying lives in the sticky bar. */}
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
                ? 'border-rose-300 bg-rose-50 text-rose-500'
                : 'border-line text-fg-subtle hover:border-rose-300 hover:text-rose-500',
            )}
          >
            <Heart size={20} className={isWishlisted ? 'fill-rose-500' : ''} />
          </button>
        </div>

        {product.hasVariants && selectedVariant?.sku && (
          <p className="text-xs text-fg-subtle">SKU: {selectedVariant.sku}</p>
        )}
      </div>
    </div>

    {/* Sticky buy bar — phones only. It carries the price so a shopper deep in
        the description still knows what they are about to pay, and it sits
        above the home indicator via safe-area padding. */}
    <div className="sm:hidden fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs text-fg-muted">{product.name}</p>
          <p className="font-semibold text-fg">{formatCurrency(activePrice)}</p>
        </div>
        <button
          onClick={handleAddToCart}
          disabled={!isAvailable}
          className={clsx(
            'ml-auto flex h-12 flex-1 items-center justify-center gap-2 rounded-brand px-6 font-semibold transition-opacity',
            isAvailable
              ? 'bg-primary text-primary-foreground hover:opacity-90'
              : 'bg-surface-alt text-fg-subtle cursor-not-allowed',
          )}
        >
          <ShoppingCart size={18} />
          {isAvailable ? 'Add to Cart' : 'Sold Out'}
        </button>
      </div>
    </div>

    {/* Reviews */}
    <div className="mt-12 border-t border-line pt-10">
      <ProductReviews storeSlug={storeSlug} productId={product.id} />
    </div>
    </>
  );
}
