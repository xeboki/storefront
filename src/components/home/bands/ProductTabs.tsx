'use client';

import { useState } from 'react';
import { FeaturedProducts } from '@/components/product/FeaturedProducts';
import type { OrderingProduct } from '@xeboki/sdk';

/**
 * One product band showing several selections, switched by name.
 *
 * "New / Featured / On sale" over a single grid — what a shop uses to put
 * three answers in the space of one, rather than three bands a shopper has to
 * scroll past.
 *
 * Switched in the browser, with every tab's products already rendered to
 * markup. The page is cached for five minutes and the lists come from the
 * same catalogue it already loaded, so fetching per tab would add a round
 * trip to save nothing — and a tab that spins is worse than one that does not
 * exist.
 */
export function ProductTabs({ tabs, storeSlug }: {
  tabs: { label: string; products: OrderingProduct[] }[];
  storeSlug: string;
}) {
  const [active, setActive] = useState(0);
  const shown = tabs[active];
  if (!shown) return null;

  return (
    <>
      <div className="mb-8 flex flex-wrap gap-2 border-b border-line">
        {tabs.map((tab, i) => (
          <button
            key={tab.label}
            type="button"
            onClick={() => setActive(i)}
            aria-current={i === active}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
              i === active
                ? 'border-primary text-primary'
                : 'border-transparent text-fg-muted hover:text-fg'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <FeaturedProducts products={shown.products} storeSlug={storeSlug} />
    </>
  );
}
