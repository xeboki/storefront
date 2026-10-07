/**
 * Saying what the shop is running, in the shop's own money.
 *
 * The API serves offers structured rather than phrased, deliberately: the
 * wording needs the currency symbol and the shop's language, and both live
 * here. It also means the words cannot drift from the rule — before this, the
 * top strip carried a hand-typed sentence that said "Free delivery over €50"
 * while the live promotion gave free delivery on everything, and nothing
 * anywhere reconciled the two.
 */
import type { ShopOffer } from '@xeboki/sdk';

/**
 * One offer, in as few words as a strip can carry.
 *
 * `money` formats an amount in the shop's currency — passed in rather than
 * imported, because this runs on the server for the header and in the
 * browser elsewhere.
 */
export function offerPhrase(
  offer: ShopOffer,
  money: (n: number) => string,
): string {
  const reward = (() => {
    switch (offer.type) {
      case 'free_shipping':
        return 'Free delivery';
      case 'fixed':
        return `${money(offer.value)} off`;
      case 'bogo':
        return 'Buy one, get one';
      default: {
        // 12 rather than 12.0 — a whole percentage is written whole.
        const pc = offer.value % 1 === 0
          ? offer.value.toFixed(0)
          : offer.value.toFixed(1);
        return `${pc}% off`;
      }
    }
  })();

  const conditions: string[] = [];
  if (offer.minOrderValue > 0) conditions.push(`over ${money(offer.minOrderValue)}`);
  if (offer.minQuantity > 0) {
    // "1 items" undoes the care everywhere else.
    conditions.push(
      offer.minQuantity === 1 ? 'on any item' : `on ${offer.minQuantity}+ items`,
    );
  }

  // A code is the thing a shopper has to carry away, so it goes last, where
  // the eye lands.
  const code = offer.code ? ` with ${offer.code}` : '';
  return `${reward}${conditions.length ? ` ${conditions.join(' ')}` : ''}${code}`;
}

/**
 * The strip's whole message: the offers, then whatever the merchant wrote.
 *
 * Offers first because they are the reason to read the strip, and the
 * merchant's own line after — it is usually a standing note about delivery or
 * returns, which keeps whether or not an offer is running.
 *
 * The strip is one line by definition and truncates, so this cannot be
 * allowed to grow without limit: past `MAX_OFFERS` a shop running a dozen
 * promotions would push its own words off the end and show none of them
 * fully.
 */
export const MAX_OFFERS = 3;

export function stripMessage(
  offers: ShopOffer[],
  merchantMessage: string,
  money: (n: number) => string,
): string {
  const said = offers.slice(0, MAX_OFFERS).map((o) => offerPhrase(o, money));
  const own = merchantMessage.trim();
  if (own) said.push(own);
  return said.join(' · ');
}
