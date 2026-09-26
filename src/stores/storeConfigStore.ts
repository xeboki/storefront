'use client';

/**
 * Lightweight client-side store for business-type-aware rendering.
 * Seeded by StoreProviders on mount — never fetches itself.
 */
import { create } from 'zustand';

// The business-type lists that used to live here are in lib/business-type.ts,
// spelled once and compared on a normalised form. Four copies of them, all in
// camelCase against an API that serves snake_case, is what kept every gate on
// a multi-word type permanently shut.

interface StoreConfigState {
  businessType: string;
  businessName: string;
  currencyCode: string;
  set: (v: Pick<StoreConfigState, 'businessType' | 'businessName' | 'currencyCode'>) => void;
}

export const useStoreConfigStore = create<StoreConfigState>()((set) => ({
  businessType: '',
  businessName: '',
  currencyCode: 'USD',
  set: (v) => set(v),
}));
