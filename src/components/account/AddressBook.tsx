'use client';

import { useState } from 'react';
import { useAddressAutocomplete } from '@/lib/address/autocomplete';
import { Plus, Trash2, Star } from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { CustomerAddress } from '@xeboki/sdk';

interface Props {
  initialAddresses: CustomerAddress[];
  customerId: string;
  storeSlug: string;
}

interface AddressFormData {
  label: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  isDefault: boolean;
}

const EMPTY_FORM: AddressFormData = {
  label: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postcode: '',
  country: 'US',
  isDefault: false,
};

export function AddressBook({ initialAddresses, customerId, storeSlug }: Props) {
  const [addresses, setAddresses] = useState(initialAddresses);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AddressFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Google Places autocomplete on line 1 (env-gated; manual entry otherwise).
  const line1Ref = useAddressAutocomplete((a) =>
    setForm((f) => ({
      ...f,
      line1: a.line1 || f.line1,
      city: a.city || f.city,
      state: a.state || f.state,
      postcode: a.postcode || f.postcode,
      country: a.country || f.country,
    })),
  );

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const res = await fetch('/api/account/addresses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId, storeSlug, ...form }),
    });

    setSaving(false);
    if (!res.ok) {
      toast.error('Failed to save address');
      return;
    }

    const { address } = await res.json();
    setAddresses((prev) => {
      const updated = form.isDefault
        ? prev.map((a) => ({ ...a, isDefault: false }))
        : prev;
      return [...updated, address];
    });
    setForm(EMPTY_FORM);
    setShowForm(false);
    toast.success('Address added');
  }

  async function handleDelete(addressId: string) {
    const res = await fetch(`/api/account/addresses/${addressId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId, storeSlug }),
    });

    if (!res.ok) {
      toast.error('Failed to delete address');
      return;
    }
    setAddresses((prev) => prev.filter((a) => a.id !== addressId));
    toast.success('Address removed');
  }

  return (
    <div className="space-y-4">
      {addresses.length === 0 && !showForm && (
        <p className="text-slate-400 text-sm">No saved addresses.</p>
      )}

      {addresses.map((addr) => (
        <div
          key={addr.id}
          className="flex items-start justify-between p-4 rounded-brand border border-slate-200 bg-surface"
        >
          <div className="space-y-0.5 text-sm">
            <div className="flex items-center gap-2">
              {addr.label && <span className="font-semibold text-slate-800">{addr.label}</span>}
              {addr.isDefault && (
                <span className="inline-flex items-center gap-0.5 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                  <Star size={10} /> Default
                </span>
              )}
            </div>
            <p className="text-slate-600">{addr.line1}</p>
            {addr.line2 && <p className="text-slate-600">{addr.line2}</p>}
            <p className="text-slate-600">
              {addr.city}{addr.state ? `, ${addr.state}` : ''} {addr.postcode}
            </p>
            <p className="text-slate-400">{addr.country}</p>
          </div>
          <button
            onClick={() => handleDelete(addr.id)}
            className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors"
            aria-label="Delete address"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}

      {showForm ? (
        <form
          onSubmit={handleAdd}
          className="space-y-3 p-4 rounded-brand border border-primary/20 bg-primary/5"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <input
                placeholder="Label (e.g. Home, Work)"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-brand text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div className="col-span-2">
              <input
                ref={line1Ref}
                required
                placeholder="Address line 1"
                value={form.line1}
                onChange={(e) => setForm({ ...form, line1: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-brand text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div className="col-span-2">
              <input
                placeholder="Address line 2"
                value={form.line2}
                onChange={(e) => setForm({ ...form, line2: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-brand text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <input
              required
              placeholder="City"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="px-3 py-2 border border-slate-200 rounded-brand text-sm focus:outline-none focus:border-primary"
            />
            <input
              placeholder="State / Province"
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
              className="px-3 py-2 border border-slate-200 rounded-brand text-sm focus:outline-none focus:border-primary"
            />
            <input
              required
              placeholder="ZIP / Postal Code"
              value={form.postcode}
              onChange={(e) => setForm({ ...form, postcode: e.target.value })}
              className="px-3 py-2 border border-slate-200 rounded-brand text-sm focus:outline-none focus:border-primary"
            />
            <input
              required
              placeholder="Country"
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              className="px-3 py-2 border border-slate-200 rounded-brand text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
              className="rounded"
            />
            Set as default address
          </label>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-brand hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Address'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 text-sm font-medium text-primary hover:opacity-80 transition-opacity"
        >
          <Plus size={16} /> Add Address
        </button>
      )}
    </div>
  );
}
