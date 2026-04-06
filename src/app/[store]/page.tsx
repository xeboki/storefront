import { notFound } from 'next/navigation';
import Link from 'next/link';
import { loadStore, loadCatalog, loadCategories } from '@/lib/sdk/store';
import { HeroSection } from '@/components/layout/HeroSection';
import { FeaturedProducts } from '@/components/product/FeaturedProducts';
import { CategoryGrid } from '@/components/product/CategoryGrid';

interface Props {
  params: { store: string };
}

const APPOINTMENT_TYPES = new Set([
  'salon', 'gym', 'service', 'petStore', 'optical', 'mobileRepair',
]);
const WORK_ORDER_TYPES = new Set(['mobileRepair', 'laundry', 'service', 'optical']);
const AGE_GATE_TYPES = new Set(['liquorStore']);

export default async function StorePage({ params }: Props) {
  const resolved = await loadStore(params.store);
  if (!resolved) notFound();

  const { apiKey, storefrontConfig, storeConfig } = resolved;
  const bt = storeConfig.businessType;

  const [catalogResult, categoriesResult] = await Promise.allSettled([
    loadCatalog(apiKey),
    loadCategories(apiKey),
  ]);

  const products = catalogResult.status === 'fulfilled' ? catalogResult.value.data : [];
  const categories = categoriesResult.status === 'fulfilled' ? categoriesResult.value.data : [];
  const featured = products.filter((p) => p.isActive).slice(0, 8);

  return (
    <div>
      {/* Age gate warning banner */}
      {AGE_GATE_TYPES.has(bt) && (
        <div className="bg-amber-50 border-b border-amber-200 py-2 px-4 text-center text-sm text-amber-800">
          You must be 21+ to purchase alcohol. By shopping here you confirm you are of legal drinking age.
        </div>
      )}

      <HeroSection storefrontConfig={storefrontConfig} storeConfig={storeConfig} storeSlug={params.store} />

      {/* Business-type CTAs */}
      {APPOINTMENT_TYPES.has(bt) && (
        <section className="bg-primary/5 border-b border-primary/10 py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Book an Appointment</h2>
              <p className="text-sm text-slate-500 mt-0.5">Choose your service, staff, and time — online in seconds.</p>
            </div>
            <Link
              href={`/${params.store}/book`}
              className="flex-shrink-0 px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-brand hover:opacity-90 transition-opacity text-sm"
            >
              Book Now
            </Link>
          </div>
        </section>
      )}

      {WORK_ORDER_TYPES.has(bt) && !APPOINTMENT_TYPES.has(bt) && (
        <section className="bg-slate-50 border-b border-slate-200 py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Track Your Order</h2>
              <p className="text-sm text-slate-500 mt-0.5">Enter your ticket number to see the status of your repair or job.</p>
            </div>
            <Link
              href={`/${params.store}/repairs`}
              className="flex-shrink-0 px-6 py-2.5 border border-primary text-primary font-semibold rounded-brand hover:bg-primary/5 transition-colors text-sm"
            >
              Track Order
            </Link>
          </div>
        </section>
      )}

      {categories.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">
            {APPOINTMENT_TYPES.has(bt) ? 'Our Services' : 'Shop by Category'}
          </h2>
          <CategoryGrid categories={categories} storeSlug={params.store} />
        </section>
      )}

      {featured.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-900">
              {APPOINTMENT_TYPES.has(bt) ? 'Featured Services' : 'Featured Products'}
            </h2>
            <Link
              href={`/${params.store}/catalog`}
              className="text-sm font-medium text-primary hover:opacity-80 transition-opacity"
            >
              View all →
            </Link>
          </div>
          <FeaturedProducts products={featured} storeSlug={params.store} />
        </section>
      )}
    </div>
  );
}
