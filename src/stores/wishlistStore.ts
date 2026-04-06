'use client';

/**
 * Client-side wishlist — persisted to localStorage.
 * Keyed per storeSlug so wishlists don't bleed across stores.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface WishlistItem {
  productId: string;
  variantId?: string;
  name: string;
  price: number;
  imageUrl?: string;
  storeSlug: string;
}

interface WishlistState {
  items: WishlistItem[];
  addItem: (item: WishlistItem) => void;
  removeItem: (productId: string, storeSlug: string, variantId?: string) => void;
  isWishlisted: (productId: string, storeSlug: string, variantId?: string) => boolean;
  clearStore: (storeSlug: string) => void;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) =>
        set((state) => {
          const exists = state.items.some(
            (i) => i.productId === item.productId && i.storeSlug === item.storeSlug && i.variantId === item.variantId,
          );
          if (exists) return state;
          return { items: [...state.items, item] };
        }),

      removeItem: (productId, storeSlug, variantId) =>
        set((state) => ({
          items: state.items.filter(
            (i) => !(i.productId === productId && i.storeSlug === storeSlug && i.variantId === variantId),
          ),
        })),

      isWishlisted: (productId, storeSlug, variantId) =>
        get().items.some(
          (i) => i.productId === productId && i.storeSlug === storeSlug && i.variantId === variantId,
        ),

      clearStore: (storeSlug) =>
        set((state) => ({
          items: state.items.filter((i) => i.storeSlug !== storeSlug),
        })),
    }),
    { name: 'xeboki-wishlist' },
  ),
);
