'use client'
/**
 * Repair status lookup.
 *
 * Rewritten for SPEC-079 against the endpoint that now exists. The previous
 * version asked for "work order # **or** phone number" and rendered fields —
 * customer name, technician notes, line items and prices — that the public
 * endpoint deliberately does not return, because this page has no login.
 *
 * Two changes matter:
 *
 * * **Both fields are required.** A ticket number alone is guessable, they are
 *   sequential; a phone number alone would list everything that person has ever
 *   brought in. Requiring both means a caller already holds the claim check and
 *   knows whose it is.
 * * **The progress steps are the statuses the till actually writes.** The old
 *   list (`received`, `diagnosing`, `waiting_parts`) matched none of them, so
 *   the tracker sat at step zero no matter where the job was.
 */
import { useState } from 'react'

interface RepairStatus {
  ticketNumber: string
  status: string
  statusLabel: string
  statusColor: string
  isReady: boolean
  device: string
  receivedAt: string | null
  estimatedReady: string | null
}

/**
 * The journey a customer is shown.
 *
 * A subset of the fourteen statuses the workflow has: the ones a customer can
 * act on or wants to see. Terminal states that are not progress — declined,
 * unrepairable, cancelled — are reported by their label instead of being given
 * a step, because showing "cancelled" as 80% along a progress bar is worse than
 * showing no bar.
 */
const STATUS_STEPS = [
  { key: 'pending', label: 'Received' },
  { key: 'diagnosed', label: 'Diagnosed' },
  { key: 'inProgress', label: 'Being worked on' },
  { key: 'qcTesting', label: 'Testing' },
  { key: 'readyForPickup', label: 'Ready' },
]

/** Statuses that map onto a step even though they are not one themselves. */
const STEP_ALIASES: Record<string, string> = {
  awaitingApproval: 'diagnosed',
  awaitingParts: 'inProgress',
  onHold: 'inProgress',
  completed: 'readyForPickup',
  delivered: 'readyForPickup',
  closed: 'readyForPickup',
}

const NOT_PROGRESS = new Set([
  'declined',
  'unrepairable',
  'cancelled',
])

function formatDate(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
}

export function RepairLookup({
  storeSlug,
  storeName,
}: {
  storeSlug: string
  storeName: string
}) {
  const [ticket, setTicket] = useState('')
  const [phone, setPhone] = useState('')
  const [repair, setRepair] = useState<RepairStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const stepKey = repair
    ? (STEP_ALIASES[repair.status] ?? repair.status)
    : ''
  const currentStepIndex = STATUS_STEPS.findIndex((s) => s.key === stepKey)
  const showProgress = repair !== null && !NOT_PROGRESS.has(repair.status)

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault()
    if (!ticket.trim() || !phone.trim()) return
    setLoading(true)
    setError(null)
    setRepair(null)

    try {
      const res = await fetch(
        `/api/repairs/lookup?store=${encodeURIComponent(storeSlug)}` +
          `&ticket=${encodeURIComponent(ticket.trim())}` +
          `&phone=${encodeURIComponent(phone.trim())}`,
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error ?? 'We could not find that repair.')
      }
      setRepair(data as RepairStatus)
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Something went wrong.',
      )
    } finally {
      setLoading(false)
    }
  }

  const received = repair ? formatDate(repair.receivedAt) : null
  const due = repair ? formatDate(repair.estimatedReady) : null

  return (
    <div className="space-y-6">
      <form onSubmit={handleLookup} className="space-y-3">
        <div>
          <label
            htmlFor="ticket"
            className="block text-sm font-medium mb-1"
          >
            Ticket number
          </label>
          <input
            id="ticket"
            type="text"
            value={ticket}
            onChange={(e) => setTicket(e.target.value)}
            placeholder="On your claim check"
            className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2"
            required
          />
        </div>
        <div>
          <label htmlFor="phone" className="block text-sm font-medium mb-1">
            Your phone number
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="The number you gave the shop"
            className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            We ask for both so nobody else can look up your repair.
          </p>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full text-white px-6 py-3 rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          {loading ? 'Checking…' : 'Check status'}
        </button>
      </form>

      {error && (
        <div
          role="alert"
          className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3"
        >
          {error}
        </div>
      )}

      {repair && (
        <div className="border rounded-xl overflow-hidden shadow-sm">
          <div className="bg-gray-50 px-6 py-4 border-b">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-gray-500">Ticket</p>
                <p className="text-xl font-bold">{repair.ticketNumber}</p>
                {repair.device && (
                  <p className="text-sm text-gray-600 mt-1">{repair.device}</p>
                )}
              </div>
              <span
                className="text-white text-sm font-medium px-3 py-1 rounded-full whitespace-nowrap"
                style={{ backgroundColor: repair.statusColor }}
              >
                {repair.statusLabel}
              </span>
            </div>
          </div>

          {showProgress && currentStepIndex >= 0 && (
            <div className="px-6 py-5 border-b">
              <ol className="flex items-center justify-between gap-1">
                {STATUS_STEPS.map((step, i) => {
                  const done = i <= currentStepIndex
                  return (
                    <li
                      key={step.key}
                      className="flex-1 flex flex-col items-center text-center"
                    >
                      <span
                        aria-hidden="true"
                        className="w-3 h-3 rounded-full mb-2"
                        style={{
                          backgroundColor: done
                            ? repair.statusColor
                            : '#E5E7EB',
                        }}
                      />
                      <span
                        className={`text-xs ${done ? 'font-medium' : 'text-gray-400'}`}
                      >
                        {step.label}
                      </span>
                    </li>
                  )
                })}
              </ol>
            </div>
          )}

          <dl className="px-6 py-4 space-y-2 text-sm">
            {received && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Booked in</dt>
                <dd>{received}</dd>
              </div>
            )}
            {due && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Expected ready</dt>
                <dd>{due}</dd>
              </div>
            )}
          </dl>

          {repair.isReady && (
            <div className="bg-green-50 border-t border-green-200 px-6 py-4 text-green-800 text-sm">
              Your repair is ready to collect
              {storeName ? ` from ${storeName}` : ''}.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
