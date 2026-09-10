'use client';

import { useEffect } from 'react';
import { reportError } from '@/lib/report-error';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportError(error, { scope: 'global', digest: error.digest });
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', padding: '48px', textAlign: 'center', color: '#111' }}>
        <h1 style={{ fontSize: 22, marginBottom: 8 }}>Something went wrong</h1>
        <p style={{ color: '#666', marginBottom: 20 }}>Please try again — we&apos;ve been notified.</p>
        <button
          onClick={() => reset()}
          style={{ background: '#111', color: '#fff', border: 0, borderRadius: 8, padding: '10px 18px', cursor: 'pointer' }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
