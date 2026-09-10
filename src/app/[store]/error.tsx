'use client';

import { useEffect } from 'react';
import { reportError } from '@/lib/report-error';

export default function StoreError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportError(error, { scope: 'store', digest: error.digest });
  }, [error]);

  return (
    <div className="max-w-lg mx-auto text-center py-24 px-4">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Something went wrong</h1>
      <p className="text-slate-500 mb-6">This page hit an error. Please try again.</p>
      <button
        onClick={() => reset()}
        className="px-5 py-2.5 rounded-brand bg-primary text-primary-foreground font-semibold hover:opacity-90"
      >
        Try again
      </button>
    </div>
  );
}
