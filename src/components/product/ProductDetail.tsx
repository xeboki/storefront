'use client';

import Image from 'next/image';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { ShoppingCart, Plus, Minus, Heart } from 'lucide-react';
import { clsx } from 'clsx';
import { useCartStore } from '@/stores/cartStore';
import { useWishlistStore } from '@/stores/wishlistStore';
import { formatCurrency } from '@/lib/utils';
import { ProductReviews } from './ProductReviews';
import type { OrderingProduct, ProductVariant } from '@xeboki/sdk';

interface Props {
  product: OrderingProduct;
  storeSlug: string;
}

export function ProductDetail({ product, storeSlug }: Props) {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    product.variants?.[0] ?? null,
  );
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

  const isAvailable = product.isActive && (!product.hasVariants || (selectedVariant?.stock ?? 0) > 0);

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
    toast.success(`${product.name} added to cart`);
  }

  return (
    // The product panel and the reviews are siblings, so they need a wrapper.
    // Without one this file does not parse, and nothing in the storefront
    // builds — not this page, the whole app.
    <>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
      {/* Image */}
      <div className="relative aspect-square rounded-brand overflow-hidden bg-slate-100">
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
          <div className="absolute inset-0 flex items-center justify-center text-slate-300">
            <ShoppingCart size={80} />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{product.name}</h1>
          <p className="text-2xl font-bold text-primary mt-2">{formatCurrency(activePrice)}</p>
        </div>

        {product.description && (
          <p className="text-slate-600 leading-relaxed">{product.description}</p>
        )}

        {/* Variants */}
        {product.hasVariants && product.variants && product.variants.length > 0 && (
          <div className="space-y-3">
            {product.variantOptions?.map((option) => (
              <div key={option.name}>
                <p className="text-sm font-semibold text-slate-700 mb-2">{option.name}</p>
                <div className="flex flex-wrap gap-2">
                  {option.values.map((value) => {
                    // Find the variant that matches this axis value
                    const matchingVariant = product.variants?.find(
                      (v) => v.attributes?.[option.name] === value,
                    );
                    const isSelected = selectedVariant?.attributes?.[option.name] === value;
                    const outOfStock = matchingVariant ? matchingVariant.stock <= 0 : false;

                    return (
                      <button
                        key={value}
                        disabled={outOfStock}
                        onClick={() => matchingVariant && setSelectedVariant(matchingVariant)}
                        className={clsx(
                          'px-3 py-1.5 rounded-brand border text-sm font-medium transition-colors',
                          isSelected
                            ? 'bg-primary text-primary-foreground border-primary'
                            : outOfStock
                            ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed line-through'
                            : 'bg-surface text-slate-700 border-slate-300 hover:border-primary',
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
            <p className="text-sm font-semibold text-slate-700">
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
                      : 'bg-surface border-slate-200 text-slate-700 hover:border-slate-400',
                  )}
                >
                  <span>{option.name}</span>
                  {option.priceAdjustment > 0 && (
                    <span className="text-xs text-slate-500">+{formatCurrency(option.priceAdjustment)}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Quantity + CTA */}
        <div className="flex items-center gap-4 pt-2">
          <div className="flex items-center border border-slate-200 rounded-brand overflow-hidden">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="px-3 py-2 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <Minus size={16} />
            </button>
            <span className="px-4 py-2 text-slate-900 font-medium min-w-[3ch] text-center">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="px-3 py-2 text-slate-600 hover:bg-slate-50 transition-colors"
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
                : 'bg-slate-200 text-slate-400 cursor-not-allowed',
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
                : 'border-slate-200 text-slate-400 hover:border-rose-300 hover:text-rose-500',
            )}
          >
            <Heart size={20} className={isWishlisted ? 'fill-rose-500' : ''} />
          </button>
        </div>

        {product.hasVariants && selectedVariant?.sku && (
          <p className="text-xs text-slate-400">SKU: {selectedVariant.sku}</p>
        )}
      </div>
    </div>

    {/* Reviews */}
    <div className="mt-12 border-t border-slate-100 pt-10">
      <ProductReviews storeSlug={storeSlug} productId={product.id} />
    </div>
    </>
  );
}
