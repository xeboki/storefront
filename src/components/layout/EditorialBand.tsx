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
  /**
   * Which of the three arrangements the band offers.
   *
   * It offered "Picture on the right", "Picture on the left" and "Words over
   * the picture", and the third one drew the first: the section computed a
   * single `flip` boolean, so `overlay` fell through to `false`. A merchant
   * picked it, was told it saved, and got the same band back — the same
   * fault `collection` had, found by the same measurement.
   *
   * The two side-by-side arrangements swap with `order` rather than by
   * reordering the markup: the words stay first in the DOM, so a screen
   * reader and a phone — where the two stack — both get the heading before
   * the photograph, whichever side it is on for everyone else.
   *
   * `imageRight` is first in the catalogue and so is the fallback; keeping it
   * as the default means a shop that predates this renders unchanged.
   */
  arrangement?: 'imageRight' | 'imageLeft' | 'overlay';
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
export function EditorialBand({
  storeConfig, storeSlug, imageUrl, stores, words, arrangement = 'imageRight',
}: Props) {
  const cities = [...new Set(stores.map((s) => s.city).filter(Boolean))];
  const count = stores.length;

  const overlaid = arrangement === 'overlay';

  /**
   * The photograph. Falls back to a tonal panel rather than a hole.
   *
   * One value for all three arrangements: the overlay lays it behind the
   * words instead of beside them, and a second copy of this would be a
   * second thing to keep in step.
   */
  const picture = (
    <ProductImage
      src={imageUrl}
      alt=""
      fill
      sizes="(max-width: 1024px) 100vw, 50vw"
      className="object-cover"
      fallback={
        <div aria-hidden className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/25 via-primary/5 to-transparent" />
          <div className="absolute -bottom-1/3 -end-1/4 h-[80%] w-[80%] rounded-full bg-primary/15 blur-3xl" />
        </div>
      }
    />
  );

  /*
   * The words. Set on a measure rather than the full width.
   *
   * `justify-center` only from lg: it exists to centre this against the
   * image beside it, and on a phone — where the image is above, not
   * beside — it just left a hole under the last line. The overlay has
   * nothing beside it at any width, so it does not ask for it.
   */
  const copy = (
    <div className={overlaid
      ? 'flex max-w-2xl flex-col px-4 py-20 sm:px-8 sm:py-28 lg:px-16'
      : 'flex flex-col px-4 py-14 sm:px-8 sm:py-20 lg:justify-center lg:px-16 lg:py-24'}>
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
  );

  /**
   * Words over the picture.
   *
   * Every element above writes its own `text-fg` / `text-fg-muted` /
   * `border-line`, and a class on an element beats a colour inherited from
   * an ancestor — so painting this band and setting a colour on the wrapper
   * would leave the heading in the page's dark ink on a photograph. The
   * tokens are redefined for the subtree instead, exactly as a reversed
   * band does it, which also means a line added to the copy later comes
   * right without being told about this arrangement.
   *
   * White rather than the brand accent, the eyebrow included: over a
   * photograph nobody has seen, small uppercase type in a mid brand colour
   * is a legibility gamble, and losing the accent on one band costs less
   * than a line a shopper cannot read. The scrim carries the contrast.
   */
  if (overlaid) {
    return (
      <section className="relative isolate overflow-hidden border-t border-line">
        <div className="absolute inset-0 -z-10 bg-surface-alt">{picture}</div>
        <div aria-hidden className="absolute inset-0 -z-10 bg-black/55" />
        <div
          className="mx-auto max-w-7xl"
          style={{
            '--color-fg': '#fff',
            '--color-fg-muted': 'rgb(255 255 255 / 0.85)',
            '--color-fg-subtle': 'rgb(255 255 255 / 0.7)',
            '--color-primary': '#fff',
            '--color-border': 'rgb(255 255 255 / 0.3)',
          } as React.CSSProperties}
        >
          {copy}
        </div>
      </section>
    );
  }

  return (
    <section className="border-t border-line">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-stretch lg:grid-cols-2">
        <div className={`relative min-h-[18rem] overflow-hidden bg-surface-alt lg:min-h-[32rem] ${
          arrangement === 'imageLeft' ? 'lg:order-first' : ''}`}>
          {picture}
        </div>
        {copy}
      </div>
    </section>
  );
}
