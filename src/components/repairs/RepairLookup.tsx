'use client'
/**
 * Repair / Work Order lookup component — Gap 53.
 * Calls the public API to fetch work order status without authentication.
 */
import { useState } from 'react'

interface WorkOrder {
  id: string
  workOrderNumber: string
  customerName: string
  deviceDescription: string
  status: string
  statusLabel: string
  statusColor: string
  estimatedCompletionDate?: string
  completedAt?: string
  notes?: string
  technicianNotes?: string
  items: WorkOrderItem[]
}

interface WorkOrderItem {
  description: string
  quantity: number
  unitPrice: number
  status: string
}

const STATUS_STEPS = [
  { key: 'received',    label: 'Received' },
  { key: 'diagnosing',  label: 'Diagnosing' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'waiting_parts', label: 'Parts Ordered' },
  { key: 'ready',       label: 'Ready' },
  { key: 'completed',   label: 'Completed' },
]

export function RepairLookup({ storeSlug, storeName }: { storeSlug: string; storeName: string }) {
  const [query, setQuery] = useState('')
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentStepIndex = workOrder
    ? STATUS_STEPS.findIndex(s => s.key === workOrder.status)
    : -1

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setError(null)
    setWorkOrder(null)

    try {
      const res = await fetch(
        `/api/repairs/lookup?store=${encodeURIComponent(storeSlug)}&q=${encodeURIComponent(query.trim())}`
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Work order not found')
      }
      const data = await res.json()
      setWorkOrder(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Search form */}
      <form onSubmit={handleLookup} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Work order # or phone number"
          className="flex-1 border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-primary text-white px-6 py-3 rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          {loading ? 'Looking up…' : 'Look Up'}
        </button>
      </form>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Result */}
      {workOrder && (
        <div className="border rounded-xl overflow-hidden shadow-sm">
          {/* Header */}
          <div className="bg-gray-50 px-6 py-4 border-b">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">Work Order</p>
                <p className="text-xl font-bold">#{workOrder.workOrderNumber}</p>
              </div>
              <span
                className="px-3 py-1 rounded-full text-sm font-medium text-white"
                style={{ backgroundColor: workOrder.statusColor || '#666' }}
              >
                {workOrder.statusLabel}
              </span>
            </div>
          </div>

          {/* Device info */}
          <div className="px-6 py-4 border-b">
            <p className="text-sm text-gray-500 mb-1">Device</p>
            <p className="font-medium">{workOrder.deviceDescription}</p>
            {workOrder.estimatedCompletionDate && (
              <p className="text-sm text-gray-500 mt-1">
                Est. completion: {new Date(workOrder.estimatedCompletionDate).toLocaleDateString()}
              </p>
            )}
          </div>

          {/* Progress tracker */}
          <div className="px-6 py-4 border-b">
            <p className="text-sm text-gray-500 mb-3">Progress</p>
            <div className="flex items-center gap-1">
              {STATUS_STEPS.map((step, i) => (
                <div key={step.key} className="flex-1 flex flex-col items-center">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      i <= currentStepIndex
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-400'
                    }`}
                  >
                    {i < currentStepIndex ? '✓' : i + 1}
                  </div>
                  <p className={`text-xs mt-1 text-center ${i <= currentStepIndex ? 'text-gray-700' : 'text-gray-400'}`}>
                    {step.label}
                  </p>
                  {i < STATUS_STEPS.length - 1 && (
                    <div className={`hidden sm:block absolute h-0.5 w-full -translate-y-3 ${i < currentStepIndex ? 'bg-green-500' : 'bg-gray-200'}`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Technician notes (public-safe) */}
          {workOrder.technicianNotes && (
            <div className="px-6 py-4 border-b">
              <p className="text-sm text-gray-500 mb-1">Technician Update</p>
              <p className="text-sm">{workOrder.technicianNotes}</p>
            </div>
          )}

          {/* Contact prompt */}
          <div className="px-6 py-4 bg-blue-50 text-sm text-blue-700">
            Questions? Contact {storeName} for updates or to approve additional repairs.
          </div>
        </div>
      )}
    </div>
  )
}
