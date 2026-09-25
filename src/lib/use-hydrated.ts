'use client';

import { useEffect, useState } from 'react';

/**
 * False on the server and on the first client render, true afterwards.
 *
 * For anything read from a localStorage-persisted store. The cart badge is the
 * case that surfaced it: the server renders no badge (it cannot know the
 * cart), the browser hydrates with items already in one, and React throws the
 * header's markup away complaining the server HTML had no matching <span>.
 *
 * Gate that state on this and the first render matches the server by
 * construction.
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
