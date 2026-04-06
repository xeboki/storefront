'use client';

import { useEffect } from 'react';
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
