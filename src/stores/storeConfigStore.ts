'use client';

/**
 * Lightweight client-side store for business-type-aware rendering.
 * Seeded by StoreProviders on mount — never fetches itself.
 */
import { create } from 'zustand';

// Business types that support appointment booking
export const APPOINTMENT_TYPES = new Set([
  'salon', 'gym', 'service', 'petStore', 'optical', 'mobileRepair',
]);

// Business types that support table selection at checkout
export const TABLE_TYPES = new Set(['restaurant', 'bar']);

// Business types that require an age gate
export const AGE_GATE_TYPES = new Set(['liquorStore']);

// Food businesses that show KDS-aware order types
export const FOOD_TYPES = new Set([
  'restaurant', 'bar', 'coffeeShop', 'qsr', 'bakery', 'foodTruck',
]);

// Work-order businesses (repair tracking, drop-off jobs)
export const WORK_ORDER_TYPES = new Set([
  'mobileRepair', 'laundry', 'service', 'optical',
]);

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
