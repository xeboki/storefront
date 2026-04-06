import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { WishlistClient } from '@/components/account/WishlistClient';
import type { Metadata } from 'next';

interface Props {
  params: { store: string };
}

export const metadata: Metadata = { title: 'Wishlist' };

export default function WishlistPage({ params }: Props) {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/${params.store}/account`}
          className="text-slate-400 hover:text-primary transition-colors"
          aria-label="Back to account"
        >
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Wishlist</h1>
      </div>

      {/* WishlistClient reads from localStorage — no server data needed */}
      <WishlistClient storeSlug={params.store} />
    </div>
  );
}
