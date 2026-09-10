'use client';

import { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from '@/stores/authStore';
import { useStoreConfigStore } from '@/stores/storeConfigStore';
import type { StorefrontConfig, StoreConfig } from '@xeboki/sdk';

interface Props {
  slug: string;
  apiKey: string;
  storeConfig: StoreConfig;
  storefrontConfig: StorefrontConfig | null;
  children: React.ReactNode;
  initialCustomer?: {
    customerId: string;
    email: string;
    name: string;
    storeSlug: string;
  } | null;
}

export function StoreProviders({ children, initialCustomer, storeConfig }: Props) {
  const { setCustomer, setLoaded } = useAuthStore();
  const setStoreConfig = useStoreConfigStore((s) => s.set);

  // Seed the store config synchronously, before children render. Doing it only
  // in the effect below meant the first paint ran with the default currency
  // (USD), so every price in a component that doesn't subscribe to the store
  // (product cards, order detail) showed "$" for a non-USD shop and never
  // corrected. The initializer runs once, ahead of the children.
  useState(() => {
    useStoreConfigStore.setState({
      businessType: storeConfig.businessType,
      businessName: storeConfig.businessName,
      currencyCode: storeConfig.currencyCode,
    });
    return null;
  });

  useEffect(() => {
    if (initialCustomer) setCustomer(initialCustomer);
    setLoaded();
  }, [initialCustomer, setCustomer, setLoaded]);

  useEffect(() => {
    setStoreConfig({
      businessType: storeConfig.businessType,
      businessName: storeConfig.businessName,
      currencyCode: storeConfig.currencyCode,
    });
  }, [storeConfig, setStoreConfig]);

  return (
    <>
      {children}
      <Toaster position="bottom-center" />
    </>
  );
}
