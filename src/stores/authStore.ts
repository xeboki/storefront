/**
 * Client-side auth state.
 * Hydrated from server session on mount (see StoreProviders).
 */
'use client';

import { create } from 'zustand';

export interface CustomerSession {
  customerId: string;
  email: string;
  name: string;
  storeSlug: string;
}

interface AuthState {
  customer: CustomerSession | null;
  isLoaded: boolean;
  setCustomer: (c: CustomerSession | null) => void;
  setLoaded: () => void;
  logout: (storeSlug: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set) => ({
  customer: null,
  isLoaded: false,

  setCustomer: (customer) => set({ customer }),

  setLoaded: () => set({ isLoaded: true }),

  logout: async (storeSlug) => {
    await fetch('/api/auth/logout', { method: 'POST' });
    set({ customer: null });
    window.location.href = `/${storeSlug}`;
  },
}));
