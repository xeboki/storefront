import Link from 'next/link';
import { storeName } from '@/lib/store-name';
import { ArrowRight } from 'lucide-react';
import type { FulfillmentLocation, StoreConfig } from '@xeboki/sdk';
import { ProductImage } from '@/components/product/ProductImage';
import type { SectionWords } from '@/lib/section-copy';

interface Props {
  storeConfig: StoreConfig;
  storeSlug: string;
  imageUrl?: string | null;
  /** Branches, to say something true rather than marketing filler. */
  stores: FulfillmentLocation[];
  /** The merchant's wording. A blank field falls back to the copy below. */
  words: SectionWords;
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
export function EditorialBand({ storeConfig, storeSlug, imageUrl, stores, words }: Props) {
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

        {/* Copy column, set on a measure rather than the full width.
            `justify-center` only from lg: it exists to centre this against the
            image beside it, and on a phone — where the image is above, not
            beside — it just left a hole under the last line. */}
        <div className="flex flex-col px-4 py-14 sm:px-8 sm:py-20 lg:justify-center lg:px-16 lg:py-24">
          {words.eyebrow && (
            <p className="eyebrow eyebrow-rule text-primary">{words.eyebrow}</p>
          )}
          <h2 className="display-lg mt-4 text-fg">{words.title || storeName(storeConfig)}</h2>

          <p className="mt-4 max-w-md text-fg-muted sm:mt-5">
            {words.lede ||
              (count > 0
                ? `Shop online and collect in ${
                    cities.length === 1 ? cities[0] : `${count} ${count === 1 ? 'store' : 'stores'}`
                  }. Everything you see is stock the shop is holding right now.`
                : 'Everything you see here is stock the shop is holding right now — no backorders, no surprises at checkout.')}
          </p>

          <dl className="mt-8 grid grid-cols-2 gap-8 border-t border-line pt-6 sm:mt-10 sm:max-w-sm sm:pt-8">
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

          <div className="mt-8 sm:mt-10">
            <Link
              href={`/${storeSlug}/locations`}
              className="group inline-flex items-center gap-2 border-b border-fg/30 pb-1 text-sm font-semibold uppercase tracking-[0.12em] text-fg transition-colors hover:border-primary hover:text-primary"
            >
              {words.linkLabel || 'Find a store'}
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
