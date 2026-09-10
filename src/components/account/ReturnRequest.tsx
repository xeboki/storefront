'use client';

/**
 * Self-service returns on the order page. Shown for fulfilled orders: the
 * customer states a reason and submits; existing requests show their status.
 */
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { RotateCcw } from 'lucide-react';

interface ReturnRow {
  returnId: string;
  status: string;
  reason: string | null;
  createdAt: string | null;
}

interface Props {
  orderId: string;
  storeSlug: string;
  eligible: boolean;
}

const STATUS_COPY: Record<string, string> = {
  requested: 'Requested — awaiting review',
  approved: 'Approved',
  rejected: 'Not approved',
  received: 'Item received',
  refunded: 'Refunded',
};

export function ReturnRequest({ orderId, storeSlug, eligible }: Props) {
  const [returns, setReturns] = useState<ReturnRow[]>([]);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/orders/${orderId}/returns?storeSlug=${encodeURIComponent(storeSlug)}`)
      .then((r) => (r.ok ? r.json() : { returns: [] }))
      .then((d) => setReturns(d.returns ?? []))
      .catch(() => setReturns([]));
  }, [orderId, storeSlug]);

  async function submit() {
    if (!reason.trim()) {
      toast.error('Please tell us why you’re returning this.');
      return;
    }
    setSubmitting(true);
    const res = await fetch(`/api/orders/${orderId}/returns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeSlug, reason: reason.trim() }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const { error } = await res.json();
      toast.error(error ?? 'Could not submit the return.');
      return;
    }
    const ret = await res.json();
    setReturns((prev) => [{ returnId: ret.return_id ?? ret.returnId, status: ret.status, reason: ret.reason, createdAt: ret.created_at ?? null }, ...prev]);
    setReason('');
    setOpen(false);
    toast.success('Return requested — we’ll email you once it’s reviewed.');
  }

  if (!eligible && returns.length === 0) return null;

  return (
    <div className="mt-6 rounded-brand border border-slate-200 p-5">
      <div className="flex items-center gap-2 mb-3">
        <RotateCcw size={16} className="text-slate-500" />
        <h3 className="font-semibold text-slate-900">Returns</h3>
      </div>

      {returns.length > 0 && (
        <ul className="space-y-2 mb-4 text-sm">
          {returns.map((r) => (
            <li key={r.returnId} className="flex justify-between gap-3">
              <span className="text-slate-600 flex-1 min-w-0 truncate">{r.reason}</span>
              <span className="text-slate-900 font-medium whitespace-nowrap">
                {STATUS_COPY[r.status] ?? r.status}
              </span>
            </li>
          ))}
        </ul>
      )}

      {eligible && !open && (
        <button
          onClick={() => setOpen(true)}
          className="text-sm font-medium text-primary hover:underline"
        >
          Request a return
        </button>
      )}

      {open && (
        <div className="space-y-3">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="What’s wrong / why are you returning this?"
            className="w-full px-3 py-2 border border-slate-200 rounded-brand text-sm focus:outline-none focus:border-primary"
          />
          <div className="flex gap-2">
            <button
              onClick={submit}
              disabled={submitting}
              className="px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-brand hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? 'Submitting…' : 'Submit return'}
            </button>
            <button onClick={() => setOpen(false)} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
