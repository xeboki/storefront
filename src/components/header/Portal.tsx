'use client';

/**
 * Renders into `document.body`, out of the header entirely.
 *
 * `position: fixed` is only relative to the viewport while no ancestor has a
 * transform, a filter or a backdrop-filter. The header has `backdrop-blur`,
 * which is `backdrop-filter`, and that quietly makes the header the
 * containing block for every fixed descendant — so a full-screen drawer
 * opened inside it came out the size of the header: a small panel at the top
 * of the page with no list in it and no scrim behind it.
 *
 * Nothing about the panel's own CSS was wrong, which is what makes this worth
 * a component rather than a fix in one place. Any overlay that must cover the
 * page goes through here.
 */
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export function Portal({ children }: { children: React.ReactNode }) {
  // There is no `document` while the server renders, and reaching for one
  // during the first client render would not match what the server sent.
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return ready ? createPortal(children, document.body) : null;
}
