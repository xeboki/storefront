import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { FulfillmentLocation, StoreConfig } from '@xeboki/sdk';
import { ProductImage } from '@/components/product/ProductImage';

interface Props {
  storeConfig: StoreConfig;
  storeSlug: string;
  imageUrl?: string | null;
  /** Branches, to say something true rather than marketing filler. */
  stores: FulfillmentLocation[];
}

/**
 * The one editorial moment on the page.
 *
 * A shop that goes hero → grid → grid → footer reads as a catalogue dump.
 * Somewhere between the two grids it needs a band with a different rhythm —
 * asymmetric, image-led, and about the shop rather than a product.
 *
 * Every claim here is drawn from the merchant's own record. Nothing invents a
 * founding year or a story: a storefront that writes copy on a merchant's
 * behalf will eventually say something untrue about them.
 */
export function EditorialBand({ storeConfig, storeSlug, imageUrl, stores }: Props) {
  const cities = [...new Set(stores.map((s) => s.city).filter(Boolean))];
  const count = stores.length;

  return (
    <section className="border-t border-line">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-stretch lg:grid-cols-2">
        {/* Image column. Falls back to a tonal panel rather than a hole. */}
        <div className="relative min-h-[18rem] overflow-hidden bg-surface-alt lg:min-h-[32rem]">
          <ProductImage
            src={imageUrl}
            alt=""
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
            fallback={
              <div aria-hidden className="absolute inset-0">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/25 via-primary/5 to-transparent" />
                <div className="absolute -bottom-1/3 -right-1/4 h-[80%] w-[80%] rounded-full bg-primary/15 blur-3xl" />
              </div>
            }
          />
        </div>

        {/* Copy column, set on a measure rather than the full width. */}
        <div className="flex flex-col justify-center px-4 py-16 sm:px-8 lg:px-16 lg:py-24">
          <p className="eyebrow eyebrow-rule text-primary">The store</p>
          <h2 className="display-lg mt-4 text-fg">{storeConfig.businessName}</h2>

          <p className="mt-5 max-w-md text-fg-muted">
            {count > 0
              ? `Shop online and collect in ${
                  cities.length === 1 ? cities[0] : `${count} ${count === 1 ? 'store' : 'stores'}`
                }. Everything you see is stock the shop is holding right now.`
              : 'Everything you see here is stock the shop is holding right now — no backorders, no surprises at checkout.'}
          </p>

          <dl className="mt-10 grid grid-cols-2 gap-8 border-t border-line pt-8 sm:max-w-sm">
            <div>
              <dt className="eyebrow text-[10px]">Stores</dt>
              <dd className="price mt-1 text-3xl font-medium text-fg">
                {String(Math.max(count, 1)).padStart(2, '0')}
              </dd>
            </div>
            <div>
              <dt className="eyebrow text-[10px]">Currency</dt>
              <dd className="price mt-1 text-3xl font-medium text-fg">
                {storeConfig.currencyCode}
              </dd>
            </div>
          </dl>

          <div className="mt-10">
            <Link
              href={`/${storeSlug}/locations`}
              className="group inline-flex items-center gap-2 border-b border-fg/30 pb-1 text-sm font-semibold uppercase tracking-[0.12em] text-fg transition-colors hover:border-primary hover:text-primary"
            >
              Find a store
              <ArrowRight
                size={15}
                className="motion-safe:transition-transform motion-safe:group-hover:translate-x-1"
              />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
