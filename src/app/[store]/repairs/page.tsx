/**
 * Work Order Customer Portal — Gap 53.
 * Customers enter their work order ID (or phone number) to see repair status.
 * No login required — order lookup is public but requires the work order ID.
 */
import type { Metadata } from 'next'
import { RepairLookup } from '@/components/repairs/RepairLookup'
import { loadStore } from '@/lib/sdk/store'
import { getStoreSlug } from '@/lib/utils/store-slug'

export async function generateMetadata(): Promise<Metadata> {
  return { title: 'Repair Status — Check Your Work Order' }
}

export default async function RepairsPage() {
  const slug = await getStoreSlug()
  const store = await loadStore(slug)

  return (
    <main className="container mx-auto px-4 py-12 max-w-lg">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Check Repair Status</h1>
        <p className="text-gray-500">
          Enter your work order ID or phone number to track your repair.
        </p>
      </div>
      <RepairLookup storeSlug={slug} storeName={store?.name ?? ''} />
    </main>
  )
}
