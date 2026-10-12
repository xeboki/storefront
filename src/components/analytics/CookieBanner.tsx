'use client';

/**
 * The cookie notice, and the thing that actually holds the tags back.
 *
 * The Analytics tab has shown a "Cookie Consent" panel since it shipped —
 * a switch, the wording, the button text, a privacy link. None of it saved,
 * nothing served it, and **no banner existed anywhere in this codebase**,
 * while GA4 and the Meta Pixel loaded on first paint and set their cookies
 * without asking. The back office showed a GDPR control panel over a shop
 * with no consent behaviour at all.
 *
 * A shop that has not switched the banner on is untouched: `bannerEnabled`
 * is false, this renders nothing, and the tags load exactly as before.
 *
 * The choice is remembered in a **cookie**, not `localStorage`, so the
 * SERVER can read it: `AnalyticsScripts` then leaves the tag out of the
 * HTML entirely rather than shipping it and hoping nothing calls it. A tag
 * that reaches the page can fire. (A consent cookie is itself strictly
 * necessary, so it needs no consent of its own.)
 */
import { useEffect, useState } from 'react';
import type { AnalyticsSettings } from '@xeboki/sdk';

export type ConsentChoice = 'accepted' | 'declined';

/** The cookie this shop's decision is kept in. Per shop, because one origin
 *  serves every shop by path in development. */
export function consentCookieName(storeSlug: string): string {
  return `xbk-consent-${storeSlug}`;
}

/** What this browser has already decided for this shop, if anything. */
export function readConsent(storeSlug: string): ConsentChoice | null {
  const name = consentCookieName(storeSlug);
  const hit = document.cookie
    .split('; ')
    .find((c) => c.startsWith(`${name}=`));
  const v = hit?.slice(name.length + 1);
  // Anything else — absent, empty, junk — is "not yet accepted", never
  // "accepted". A tag loaded because a value could not be read is a
  // shopper tracked by accident.
  return v === 'accepted' || v === 'declined' ? v : null;
}

function writeConsent(storeSlug: string, choice: ConsentChoice): void {
  // A year, which is the longest the ICO and CNIL both consider reasonable
  // before asking again.
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie =
    `${consentCookieName(storeSlug)}=${choice}; path=/; max-age=${maxAge}; samesite=lax`;
}

interface Props {
  analytics?: AnalyticsSettings | null;
  storeSlug: string;
}

export function CookieBanner({ analytics, storeSlug }: Props) {
  const consent = analytics?.consent;
  // Rendered only after mount: the server cannot know what this browser has
  // already chosen, and drawing the banner in the server HTML would flash it
  // at every shopper who accepted months ago.
  const [choice, setChoice] = useState<ConsentChoice | null | 'unknown'>('unknown');

  useEffect(() => {
    setChoice(readConsent(storeSlug));
  }, [storeSlug]);

  if (!consent?.bannerEnabled) return null;
  if (choice === 'unknown' || choice !== null) return null;

  const decide = (next: ConsentChoice) => {
    writeConsent(storeSlug, next);
    setChoice(next);
    // The tags are decided on the SERVER, from the cookie just written, so
    // an accept needs one reload to take effect. A decline needs none —
    // there was nothing in the page to undo.
    if (next === 'accepted') window.location.reload();
  };

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie notice"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface px-4 py-4 shadow-lg sm:px-6"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-fg-muted">
          {consent.message}
          {consent.privacyUrl ? (
            <>
              {' '}
              <a
                href={consent.privacyUrl}
                className="underline underline-offset-2 hover:text-fg"
              >
                Privacy policy
              </a>
            </>
          ) : null}
        </p>
        {/* Both buttons, same size, same weight. A notice whose only button
            is "Accept" is the dark pattern the EDPB names, so declining is
            never the smaller target. */}
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => decide('declined')}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-surface-alt"
          >
            {consent.declineLabel}
          </button>
          <button
            type="button"
            onClick={() => decide('accepted')}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-on-primary hover:opacity-90"
          >
            {consent.acceptLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
