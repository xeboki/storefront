import { AlertCircle } from 'lucide-react';
import { needsAgeGate } from '@/lib/business-type';

/**
 * The statutory age statement, for a shop that sells alcohol.
 *
 * In the shell rather than in the home page's band list, which is where it
 * used to live, because a band list is something a merchant empties. It
 * reached the page through `default_layout` — the fallback served only to a
 * shop that has never opened the editor — and **not one of the eight
 * templates a liquor store or a bar is offered includes it**. So applying
 * any template at all, or deleting one band, took the notice off the shop
 * for good; and even before that it was on the home page alone, never on a
 * product page and never at checkout.
 *
 * Same argument as `ClosedForOrders` next to it, only stronger: said once,
 * at the top, on every page, and not something the page composer can remove.
 *
 * The wording is the merchant's because the age is: 21 in the United States,
 * 18 across most of Europe. A shop that states the wrong one is making a
 * claim about the law, so the default names neither.
 */
export function AgeNotice({
  businessType, wording,
}: {
  businessType: string | null | undefined;
  wording?: string | null;
}) {
  if (!needsAgeGate(businessType)) return null;

  return (
    <div className="border-b border-warning-border bg-warning-bg">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
        <AlertCircle size={16} className="flex-shrink-0 text-warning" aria-hidden />
        <p className="text-sm text-warning-fg">
          {(wording || '').trim()
            || 'By shopping here you confirm you are old enough to buy alcohol where you live.'}
        </p>
      </div>
    </div>
  );
}
