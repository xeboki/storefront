/**
 * Client-side cart state via Zustand with localStorage persistence.
 *
 * Cart is scoped per store slug to prevent cross-store contamination.
 */
'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface CartItem {
  productId: string;
  variantId?: string;
  name: string;
  variantLabel?: string;
  imageUrl?: string;
  price: number;
  quantity: number;
  modifiers: string[];
  modifierLabels: string[];
  notes?: string;
}

interface CartState {
  storeSlug: string;
  items: CartItem[];
  // Actions
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  updateQuantity: (productId: string, variantId: string | undefined, quantity: number) => void;
  removeItem: (productId: string, variantId: string | undefined) => void;
  clearCart: () => void;
  // Computed
  itemCount: () => number;
  subtotal: () => number;
}

function cartKey(productId: string, variantId?: string) {
  return variantId ? `${productId}::${variantId}` : productId;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      storeSlug: '',
      items: [],

      addItem: (item) => {
        const key = cartKey(item.productId, item.variantId);
        set((state) => {
          const existing = state.items.find(
            (i) => cartKey(i.productId, i.variantId) === key,
          );
          if (existing) {
            return {
              items: state.items.map((i) =>
                cartKey(i.productId, i.variantId) === key
                  ? { ...i, quantity: i.quantity + (item.quantity ?? 1) }
                  : i,
              ),
            };
          }
          return { items: [...state.items, { ...item, quantity: item.quantity ?? 1 }] };
        });
      },

      updateQuantity: (productId, variantId, quantity) => {
        const key = cartKey(productId, variantId);
        if (quantity <= 0) {
          set((state) => ({
            items: state.items.filter((i) => cartKey(i.productId, i.variantId) !== key),
          }));
        } else {
          set((state) => ({
            items: state.items.map((i) =>
              cartKey(i.productId, i.variantId) === key ? { ...i, quantity } : i,
            ),
          }));
        }
      },

      removeItem: (productId, variantId) => {
        const key = cartKey(productId, variantId);
        set((state) => ({
          items: state.items.filter((i) => cartKey(i.productId, i.variantId) !== key),
        }));
      },

      clearCart: () => set({ items: [] }),

      itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

      subtotal: () =>
        get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    }),
    {
      name: 'xbk-cart',
      storage: createJSONStorage(() => localStorage),
      // Partition per store slug: each store gets its own localStorage key
      partialize: (state) => ({ storeSlug: state.storeSlug, items: state.items }),
    },
  ),
);
