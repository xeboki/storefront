/**
 * Repair quote approval.
 *
 * SPEC-079. The endpoints behind this shipped with SPEC-073 Phase 5 and the
 * page was never built, so every quote the system emailed linked to nothing —
 * and the link itself pointed at `localhost:3011`, because the base URL
 * defaulted there and was set in no environment file. A shop found out when the
 * customer rang to say the button did nothing.
 *
 * No login. The token in the link is the whole authorisation, which is why the
 * API returns the same 404 for a wrong token and a missing quote.
 */
import type { Metadata } from 'next'
import { RepairEstimateApproval } from '@/components/repairs/RepairEstimateApproval'
import { loadStore } from '@/lib/sdk/store'
import { notFound } from 'next/navigation'
import { getStoreSlug } from '@/lib/utils/store-slug'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Your repair quote',
    // A quote is addressed to one person and reachable by anyone holding the
    // link. It has no business in a search index.
    robots: { index: false, follow: false },
  }
}

type Props = {
  params: { store: string }
  // Next 14: a plain object, not a promise. The promise form is Next 15's API
  // and would leave both values undefined here — the page would render its
  // "link incomplete" branch for every valid link.
  searchParams: { e?: string; t?: string }
}

export default async function RepairEstimatePage({ params, searchParams }: Props) {
  // The middleware rewrite supplies the slug on the shared deployment; the
  // route param is what a shop on its own domain has. Either resolves.
  const slug = params.store || (await getStoreSlug())
  if (!slug) notFound()
  const store = await loadStore(slug)
  const { e: estimateId, t: token } = searchParams

  if (!estimateId || !token) {
    return (
      <main className="container mx-auto px-4 py-12 max-w-lg text-center">
        <h1 className="text-2xl font-bold mb-2">Quote link incomplete</h1>
        <p className="text-gray-500">
          This link is missing part of its address. Please open the quote from
          the email the shop sent you, or ring them for a new one.
        </p>
      </main>
    )
  }

  return (
    <main className="container mx-auto px-4 py-12 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Your repair quote</h1>
        <p className="text-gray-500">
          {store?.storeConfig.businessName
            ? `${store.storeConfig.businessName} has looked at your item and priced the work.`
            : 'The shop has looked at your item and priced the work.'}
        </p>
      </div>
      <RepairEstimateApproval
        storeSlug={slug}
        estimateId={estimateId}
        token={token}
      />
    </main>
  )
}
