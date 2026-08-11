'use client'
/**
 * Approve, part-approve or decline a repair quote.
 *
 * SPEC-079. Line-by-line approval is the point: a shop that quotes a screen and
 * a battery and gets back a flat "no" learns nothing, and one that gets back
 * "yes to the screen" has a job. Every benchmarked system does this and the API
 * has supported it since SPEC-073 — there was simply no page.
 *
 * Required lines cannot be unticked. They are the work the shop will not do the
 * job without, and letting a customer approve a repair minus its required part
 * produces an agreement neither side can honour.
 */
import { useCallback, useEffect, useState } from 'react'

interface EstimateLine {
  id: string
  description: string
  quantity: number
  unit_price: number
  mandatory?: boolean
  accepted?: boolean
}

interface Estimate {
  estimate_id: string
  status: string
  version: number
  lines: EstimateLine[]
  tax_percent: number
  discount: number
  expires_at: string | null
  responded_at: string | null
}

const ANSWERED = new Set(['approved', 'partial', 'declined'])

function money(n: number): string {
  return n.toFixed(2)
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
}

export function RepairEstimateApproval({
  storeSlug,
  estimateId,
  token,
}: {
  storeSlug: string
  estimateId: string
  token: string
}) {
  const [estimate, setEstimate] = useState<Estimate | null>(null)
  const [accepted, setAccepted] = useState<Set<string>>(new Set())
  const [name, setName] = useState('')
  const [declineReason, setDeclineReason] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/repairs/estimate?store=${encodeURIComponent(storeSlug)}` +
          `&e=${encodeURIComponent(estimateId)}&t=${encodeURIComponent(token)}`,
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Could not load this quote.')

      const est = data as Estimate
      setEstimate(est)
      // Everything starts ticked. A quote is the shop's recommendation, so the
      // customer is opting out of work rather than opting into it.
      setAccepted(new Set(est.lines.map((l) => l.id)))
      if (ANSWERED.has(est.status)) setDone(est.status)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }, [storeSlug, estimateId, token])

  useEffect(() => {
    void load()
  }, [load])

  function toggle(line: EstimateLine) {
    if (line.mandatory) return
    setAccepted((prev) => {
      const next = new Set(prev)
      if (next.has(line.id)) {
        next.delete(line.id)
      } else {
        next.add(line.id)
      }
      return next
    })
  }

  async function submit(declineAll: boolean) {
    if (!estimate) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/repairs/estimate?store=${encodeURIComponent(storeSlug)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            estimate_id: estimate.estimate_id,
            public_token: token,
            // Declining everything sends an empty list rather than a separate
            // flag, so the API decides the outcome from one rule instead of two.
            accepted_line_ids: declineAll ? [] : [...accepted],
            approved_by_name: name.trim() || undefined,
            decline_reason: declineAll
              ? declineReason.trim() || undefined
              : undefined,
          }),
        },
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Could not send your answer.')
      setDone(data.status ?? 'approved')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-gray-500">Loading your quote…</p>
  }

  if (error && !estimate) {
    return (
      <div
        role="alert"
        className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3"
      >
        {error}
      </div>
    )
  }

  if (!estimate) return null

  const chosen = estimate.lines.filter(
    (l) => l.mandatory || accepted.has(l.id),
  )
  const subtotal = chosen.reduce(
    (sum, l) => sum + l.unit_price * l.quantity,
    0,
  )
  const afterDiscount = Math.max(0, subtotal - (estimate.discount ?? 0))
  const total = afterDiscount * (1 + (estimate.tax_percent ?? 0) / 100)
  const expires = formatDate(estimate.expires_at)
  const hasOptional = estimate.lines.some((l) => !l.mandatory)

  if (done) {
    const message =
      done === 'declined'
        ? 'You have declined this quote. The shop will be in touch about collecting your item.'
        : done === 'partial'
          ? 'Thank you — the shop has your answer and will do the work you approved.'
          : 'Thank you — the shop has your approval and will get started.'
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl px-6 py-6">
        <h2 className="font-semibold text-green-900 mb-1">Answer received</h2>
        <p className="text-green-800 text-sm">{message}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {expires && (
        <p className="text-sm text-gray-500">
          This quote holds until {expires}.
        </p>
      )}

      <div className="border rounded-xl overflow-hidden">
        <ul className="divide-y">
          {estimate.lines.map((line) => {
            const on = line.mandatory || accepted.has(line.id)
            return (
              <li key={line.id} className="px-5 py-4">
                <label
                  className={`flex items-start gap-3 ${line.mandatory ? '' : 'cursor-pointer'}`}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    disabled={line.mandatory}
                    onChange={() => toggle(line)}
                    className="mt-1 w-4 h-4"
                  />
                  <span className="flex-1">
                    <span className="flex justify-between gap-4">
                      <span className="font-medium">{line.description}</span>
                      <span className="whitespace-nowrap">
                        {money(line.unit_price * line.quantity)}
                      </span>
                    </span>
                    <span className="block text-sm text-gray-500 mt-0.5">
                      {line.quantity > 1 && `Quantity ${line.quantity}`}
                      {line.quantity > 1 && line.mandatory && ' · '}
                      {line.mandatory && 'Required for this repair'}
                    </span>
                  </span>
                </label>
              </li>
            )
          })}
        </ul>

        <div className="bg-gray-50 px-5 py-4 space-y-1 text-sm border-t">
          <div className="flex justify-between">
            <span className="text-gray-500">Work you have chosen</span>
            <span>{money(subtotal)}</span>
          </div>
          {estimate.discount > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Discount</span>
              <span>−{money(estimate.discount)}</span>
            </div>
          )}
          {estimate.tax_percent > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">
                Tax ({estimate.tax_percent}%)
              </span>
              <span>{money(total - afterDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold text-base pt-1">
            <span>Total</span>
            <span>{money(total)}</span>
          </div>
        </div>
      </div>

      {hasOptional && (
        <p className="text-sm text-gray-500">
          Untick anything you would rather not have done. Items marked required
          are needed for the repair to work at all.
        </p>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-1">
          Your name
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="So the shop knows who approved it"
          className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2"
        />
      </div>

      {error && (
        <div
          role="alert"
          className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3"
        >
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          disabled={saving || chosen.length === 0}
          onClick={() => void submit(false)}
          className="flex-1 text-white px-6 py-3 rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          {saving ? 'Sending…' : `Approve ${money(total)}`}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => void submit(true)}
          className="flex-1 border px-6 py-3 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50"
        >
          Decline the whole quote
        </button>
      </div>

      <div>
        <label
          htmlFor="reason"
          className="block text-sm font-medium mb-1 text-gray-500"
        >
          If you are declining, it helps to say why (optional)
        </label>
        <textarea
          id="reason"
          value={declineReason}
          onChange={(e) => setDeclineReason(e.target.value)}
          rows={2}
          className="w-full border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2"
        />
      </div>
    </div>
  )
}
