'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '@/stores/authStore';

interface Props {
  storeSlug: string;
}

export function RegisterForm({ storeSlug }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const setCustomer = useAuthStore((s) => s.setCustomer);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeSlug, name, email, password }),
    });

    setLoading(false);

    if (!res.ok) {
      const { error } = await res.json();
      toast.error(error ?? 'Registration failed');
      return;
    }

    const { customer } = await res.json();
    setCustomer({
      customerId: customer.id,
      email: customer.email,
      name: customer.name,
      storeSlug,
    });
    toast.success(`Welcome, ${customer.name}!`);
    window.location.href = `/${storeSlug}/account`;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border border-slate-200 rounded-brand text-sm focus:outline-none focus:border-primary"
          placeholder="Jane Smith"
        />
      </div>
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
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 border border-slate-200 rounded-brand text-sm focus:outline-none focus:border-primary"
          placeholder="At least 8 characters"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 bg-primary text-primary-foreground font-semibold rounded-brand hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {loading ? 'Creating account…' : 'Create Account'}
      </button>
    </form>
  );
}
