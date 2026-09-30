/**
 * The home page, drawn from the list the merchant arranged.
 *
 * The API resolves the fallback, so what arrives here is always a real list:
 * either the shop's own arrangement or the page its trade has always had.
 * This renders it, and its only opinions are the two below.
 */
import { bandFor } from './registry';
import type { SectionContext } from './types';
import type { HomeSection } from '@xeboki/sdk';

export function HomeSections({ sections, ctx }: {
  sections: HomeSection[];
  ctx: SectionContext;
}) {
  return (
    <div>
      {sections.map((section) => {
        // Switched off by the merchant. Kept in the list rather than deleted,
        // so switching it back on restores its place and its words.
        if (!section.visible) return null;

        // A band this build cannot draw. Skipped in silence: the API already
        // drops types it does not know, so reaching here means a storefront
        // older than the API it is talking to — and half a page is better
        // than a crash, on a page that is somebody's shop.
        const Band = bandFor(section.type);
        if (!Band) return null;

        return <Band key={section.id} section={section} ctx={ctx} />;
      })}
    </div>
  );
}
