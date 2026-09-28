import { PauseCircle } from 'lucide-react';

/**
 * The shop is browsable but not taking orders.
 *
 * The Storefront Overview tab has had an "Accept Online Orders" switch since
 * it shipped and nothing read it: a merchant closing online ordering for the
 * whole shop closed nothing, and orders kept arriving. The live switch was
 * `ordering_enabled`, which is per LOCATION.
 *
 * Said once, at the top, rather than as a disabled button a shopper discovers
 * at the end of a checkout they have already filled in. The server refuses the
 * order as well — this band is the polite half.
 */
export function ClosedForOrders({ shown }: { shown: boolean }) {
  if (!shown) return null;

  return (
    <div className="border-b border-warning-border bg-warning-bg">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
        <PauseCircle size={16} className="flex-shrink-0 text-warning" aria-hidden />
        <p className="text-sm text-warning-fg">
          <span className="font-semibold">Not taking orders right now.</span>{' '}
          You can still browse — ordering will be back shortly.
        </p>
      </div>
    </div>
  );
}
