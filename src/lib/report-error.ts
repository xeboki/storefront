'use client';

/** Sends a client error to /api/log (best-effort, never throws). */
export function reportError(error: Error, context?: Record<string, unknown>) {
  try {
    const payload = {
      message: error.message,
      stack: error.stack,
      url: typeof window !== 'undefined' ? window.location.href : '',
      ...context,
    };
    const blob = JSON.stringify(payload);
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon('/api/log', new Blob([blob], { type: 'application/json' }));
    } else {
      fetch('/api/log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: blob, keepalive: true }).catch(() => {});
    }
  } catch {
    /* never let reporting break the page */
  }
}
