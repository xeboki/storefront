/**
 * The shop says what it is running, in its own money.
 *
 * The strip used to carry a sentence somebody typed by hand, which is how it
 * came to read "Free delivery over €50" on a shop whose live promotion gave
 * free delivery on everything. Said from the promotions themselves, the words
 * cannot contradict the rule — so what matters here is that each phrase is
 * what the promotion actually does.
 */
import { describe, expect, it } from 'vitest';
import { offerPhrase, stripMessages } from './offers';
import type { ShopOffer } from '@xeboki/sdk';

const money = (n: number) => `€${n.toFixed(2)}`;

function offer(over: Partial<ShopOffer> = {}): ShopOffer {
  return {
    id: 'o', name: 'Offer', code: '', kind: 'automatic',
    type: 'percentage', value: 10, minOrderValue: 0, minQuantity: 0,
    ...over,
  };
}

describe('one offer in as few words as a strip can carry', () => {
  it('says free delivery as free delivery, not as money off', () => {
    // It is worth the fee, not a sum off the goods. "€0.00 off" is what a
    // cash-shaped reward with no cash value renders as.
    expect(offerPhrase(offer({ type: 'free_shipping', value: 0 }), money))
      .toBe('Free delivery');
  });

  it('writes a whole percentage whole', () => {
    expect(offerPhrase(offer({ value: 12 }), money)).toBe('12% off');
    expect(offerPhrase(offer({ value: 12.5 }), money)).toBe('12.5% off');
  });

  it('puts an amount in the shop currency', () => {
    expect(offerPhrase(offer({ type: 'fixed', value: 5 }), money))
      .toBe('€5.00 off');
  });

  it('says the minimum, because that is the condition a shopper must meet', () => {
    expect(offerPhrase(offer({ type: 'free_shipping', minOrderValue: 50 }), money))
      .toBe('Free delivery over €50.00');
  });

  it('does not write "1 items"', () => {
    expect(offerPhrase(offer({ minQuantity: 1 }), money))
      .toBe('10% off on any item');
    expect(offerPhrase(offer({ minQuantity: 3 }), money))
      .toBe('10% off on 3+ items');
  });

  it('ends on the code, which is the thing to carry away', () => {
    expect(offerPhrase(offer({ value: 12, code: 'AUTUMNWALK' }), money))
      .toBe('12% off with AUTUMNWALK');
  });

  it('says nothing about a code for an offer that applies itself', () => {
    expect(offerPhrase(offer({ code: '' }), money)).not.toContain('with');
  });
});

describe('the strip', () => {
  it('leads with the offers and keeps the merchant their own words', () => {
    expect(stripMessages(
      [offer({ type: 'free_shipping' })],
      'Complimentary samples with every order',
      money,
    )).toEqual(['Free delivery', 'Complimentary samples with every order']);
  });

  it('is just the offers when the merchant wrote nothing', () => {
    expect(stripMessages([offer({ value: 12, code: 'X' })], '   ', money))
      .toEqual(['12% off with X']);
  });

  it('is just their words when nothing is running', () => {
    expect(stripMessages([], 'Free returns for 30 days', money))
      .toEqual(['Free returns for 30 days']);
  });

  it('is empty when there is nothing to say', () => {
    expect(stripMessages([], '', money)).toEqual([]);
  });

  it('drops nothing, however many are running', () => {
    // Joining them into one line truncated the tail away, and capping the
    // list dropped the same offers more quietly. The strip rotates, so a
    // shop running a dozen promotions shows a dozen — one at a time, each
    // with its full wording.
    const many = Array.from({ length: 12 }, (_, i) =>
      offer({ id: `o${i}`, value: i + 1 }));
    const lines = stripMessages(many, 'Our note', money);
    expect(lines).toHaveLength(13);
    expect(lines[0]).toBe('1% off');
    expect(lines.at(-1)).toBe('Our note');
    // and no line is a run-on of several offers
    expect(lines.every((l) => !l.includes(' · '))).toBe(true);
  });
});
