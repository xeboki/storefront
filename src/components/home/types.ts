/**
 * What every home-page band is handed.
 *
 * One context object, built once by the page, rather than each band fetching
 * for itself. A band that fetched would turn a merchant reordering their page
 * into a page that got slower the more they arranged — and three bands asking
 * for the catalogue is three round trips for one list.
 */
import type {
  HomeSection, OrderingCategory, OrderingProduct, StoreConfig, StorefrontConfig,
} from '@xeboki/sdk';

export interface SectionContext {
  storeSlug: string;
  storeConfig: StoreConfig;
  storefrontConfig: StorefrontConfig | null;
  /** Everything active in this branch's catalogue. */
  products: OrderingProduct[];
  categories: OrderingCategory[];
  /** The merchant's chosen products, already resolved and filtered. */
  featured: OrderingProduct[];
  /** The merchant's chosen departments, else all of them. */
  shownCategories: OrderingCategory[];
  /** The API key, for a band that genuinely has to fetch its own. */
  apiKey: string;
}

export interface SectionProps {
  section: HomeSection;
  ctx: SectionContext;
  /**
   * This block is inside a column.
   *
   * Passed down rather than inferred, because a band cannot tell: the same
   * component draws a full-width featured grid and a four-item carousel in a
   * third of the page, and the difference is entirely in who is asking.
   */
  nested?: boolean;
}

/** Words for a band: the merchant's, falling back to the band's own. */
export interface BandWords {
  eyebrow: string;
  title: string;
  lede: string;
  linkLabel: string;
}
