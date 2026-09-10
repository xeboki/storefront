'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '@/stores/authStore';
import { signInWithEmail, friendlyAuthError } from '@/lib/auth/firebase-client';

interface Props {
  storeSlug: string;
}

export function LoginForm({ storeSlug }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const setCustomer = useAuthStore((s) => s.setCustomer);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    let idToken: string;
    try {
      idToken = await signInWithEmail(storeSlug, email, password);
    } catch (err) {
      setLoading(false);
      toast.error(friendlyAuthError(err));
      return;
    }

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeSlug, idToken }),
    });

    setLoading(false);

    if (!res.ok) {
      const { error } = await res.json();
      toast.error(error ?? 'Login failed');
      return;
    }

    const { customer } = await res.json();
    setCustomer({
      customerId: customer.id,
      email: customer.email,
      name: customer.name,
      storeSlug,
    });
    toast.success(`Welcome back, ${customer.name}!`);
    window.location.href = `/${storeSlug}/account`;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 border border-slate-200 rounded-brand text-sm focus:outline-none focus:border-primary"
          placeholder="you@example.com"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 border border-slate-200 rounded-brand text-sm focus:outline-none focus:border-primary"
          placeholder="••••••••"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 bg-primary text-primary-foreground font-semibold rounded-brand hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {loading ? 'Signing in…' : 'Sign In'}
      </button>
    </form>
  );
}
