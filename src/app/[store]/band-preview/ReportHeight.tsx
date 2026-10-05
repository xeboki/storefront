'use client';

import { useEffect } from 'react';

/**
 * Tell whoever is framing this how tall the band actually is.
 *
 * The editor used to give the preview a fixed 16:9 box, which is wrong in
 * both directions at once: a trust strip left two inches of empty panel above
 * and below it, and an editorial band was taller than the box and grew a
 * scrollbar — so the merchant was scrolling a picture of their own page
 * inside a window, instead of just seeing the band.
 *
 * Measured here because only this side can measure it: the two are on
 * different origins, so the back office cannot read into the frame.
 *
 * A plain string rather than an object: it crosses a JS/Dart boundary on the
 * other side, and a number in a string needs no interop to read. Nothing
 * here is sensitive — it is the height of a public page.
 */
export function ReportHeight() {
  useEffect(() => {
    let last = -1;
    const send = () => {
      const height = Math.ceil(
        document.documentElement.getBoundingClientRect().height,
      );
      // Only on a real change: a resize observer fires on every paint while
      // images decode, and each message costs a relayout in the frame above.
      if (height > 0 && height !== last) {
        last = height;
        window.parent?.postMessage(`xeboki:band-height:${height}`, '*');
      }
    };

    const observer = new ResizeObserver(send);
    observer.observe(document.documentElement);
    // A picture that has not decoded yet has no height, so the first measure
    // is nearly always short.
    window.addEventListener('load', send);
    send();

    return () => {
      observer.disconnect();
      window.removeEventListener('load', send);
    };
  }, []);

  return null;
}
