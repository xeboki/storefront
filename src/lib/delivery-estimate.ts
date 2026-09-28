import type { DeliveryEstimate } from '@xeboki/sdk';

/**
 * How a shop's delivery estimate reads to a shopper.
 *
 * Three settings on the Shipping screen, written since it shipped and shown
 * nowhere: a merchant set "2 to 4 days, order by 3pm" and no shopper ever saw
 * it. It is the one thing someone wants to know before they buy.
 *
 * Returns null when the shop has never said. An invented delivery promise is
 * worse than none, because a shopper holds you to it.
 */
export function deliveryEstimateText(
  estimate: DeliveryEstimate | null | undefined,
): { range: string; cutoff: string } | null {
  const min = estimate?.minDays;
  const max = estimate?.maxDays;
  if (min === null || min === undefined || max === null || max === undefined) {
    return null;
  }

  const range =
    min === max
      ? min === 0
        ? 'Same day'
        : min === 1
          ? 'Next day'
          : `${min} days`
      : `${min}–${max} days`;

  return {
    range,
    // Only alongside the estimate: "order by 2pm" on its own says nothing
    // about when anything arrives.
    cutoff: estimate?.cutoff ? `Order by ${estimate.cutoff}` : '',
  };
}
