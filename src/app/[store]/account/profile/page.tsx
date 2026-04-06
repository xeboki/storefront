'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

interface Props {
  params: { store: string };
}

// Client component — reads auth state directly
export default function AccountProfilePage({ params }: Props) {
  const router = useRouter();
  const customer = useAuthStore((s) => s.customer);

  const [name, setName] = useState(customer?.name ?? '');
  const [phone, setPhone] = useState(customer?.phone ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  if (!customer) {
    router.replace(`/${params.store}/login?next=/${params.store}/account/profile`);
    return null;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSaved(false);

    const res = await fetch('/api/account/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeSlug: params.store, name: name.trim(), phone: phone.trim() }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'Failed to save changes');
      return;
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/${params.store}/account`}
          className="text-slate-400 hover:text-primary transition-colors"
          aria-label="Back to account"
        >
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Edit Profile</h1>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Full name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Your name"
            className="w-full px-3 py-2.5 border border-slate-200 rounded-brand text-sm focus:outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Email
          </label>
          <input
            type="email"
            value={customer.email ?? ''}
            disabled
            className="w-full px-3 py-2.5 border border-slate-100 rounded-brand text-sm text-slate-400 bg-slate-50 cursor-not-allowed"
          />
          <p className="text-xs text-slate-400 mt-1">Email address cannot be changed here.</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Phone <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 (555) 000-0000"
            className="w-full px-3 py-2.5 border border-slate-200 rounded-brand text-sm focus:outline-none focus:border-primary"
          />
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}
        {saved && <p className="text-sm text-emerald-600">Profile saved.</p>}

        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-semibold rounded-brand hover:opacity-90 disabled:opacity-50 transition-opacity text-sm"
        >
          <Save size={16} />
          {loading ? 'Saving…' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}
