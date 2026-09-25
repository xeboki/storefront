/**
 * Can a shopper actually buy this?
 *
 * One rule, because the answer was being worked out separately in three
 * places and two of them forgot the stock. A product page offered "Add to
 * Cart" on a tracked product with nothing on hand, and the catalog card put a
 * quick-add button beside it — while the order endpoint refused the line with
 * a 409. Location-first browsing made it plain: at a branch stocking nothing,
 * every product still invited a purchase.
 *
 * `trackInventory: false` means the merchant does not count this thing, so it
 * is always sellable. That distinction is why a bare `stock > 0` is wrong.
 */
import type { OrderingProduct, ProductVariant } from '@xeboki/sdk';

/** One variation, against the stock figure for the store in scope. */
export function variantIsSellable(
  product: OrderingProduct,
  variant: ProductVariant | null,
): boolean {
  if (!variant) return false;
  return !product.trackInventory || variant.stock > 0;
}

/** A product with no variations, against its own pool. */
export function productIsSellable(product: OrderingProduct): boolean {
  if (!product.isActive) return false;
  if (!product.trackInventory) return true;
  return (product.stockQuantity ?? 0) > 0;
}

/**
 * The answer a buy button should use.
 *
 * A product WITH variations is bought by variation, so it needs one chosen and
 * that one in stock — its own pool is not sellable
 * (see the API's `pool_is_unsellable`).
 */
export function canBuy(
  product: OrderingProduct,
  selectedVariant: ProductVariant | null,
): boolean {
  if (!product.isActive) return false;
  return product.hasVariants
    ? variantIsSellable(product, selectedVariant)
    : productIsSellable(product);
}
