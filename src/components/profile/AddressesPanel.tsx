"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, MapPin, Check } from "lucide-react";
import Input from "@/components/ui/Input";
import { addressesApi } from "@/lib/api";

interface Props {
  token: string;
}

interface Address {
  id: string;
  label: string;
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  is_default: boolean;
}

const emptyForm = {
  label: "Home",
  full_name: "",
  phone: "",
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  zip_code: "",
  country: "",
  is_default: false,
};

export default function AddressesPanel({ token }: Props) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Address | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    addressesApi
      .list(token)
      .then(setAddresses)
      .catch((e) => setError(e.message ?? "Failed to load addresses."))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm, is_default: addresses.length === 0 });
    setShowForm(true);
  };

  const openEdit = (a: Address) => {
    setEditing(a);
    setForm({
      label: a.label, full_name: a.full_name, phone: a.phone,
      address_line1: a.address_line1, address_line2: a.address_line2,
      city: a.city, state: a.state, zip_code: a.zip_code,
      country: a.country, is_default: a.is_default,
    });
    setShowForm(true);
  };

  const set = (k: keyof typeof emptyForm, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      if (editing) {
        await addressesApi.update(editing.id, form, token);
      } else {
        await addressesApi.create(form, token);
      }
      setShowForm(false);
      load();
    } catch (err: any) {
      setError(err.message ?? "Failed to save address.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (a: Address) => {
    if (!confirm(`Delete address "${a.label}"?`)) return;
    setError("");
    try {
      await addressesApi.delete(a.id, token);
      load();
    } catch (err: any) {
      setError(err.message ?? "Failed to delete address.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-[#11100E]">Saved Addresses</h2>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 bg-[#5D1C34] text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-[#4a1628] transition-colors"
        >
          <Plus size={14} /> Add Address
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}

      {loading && <p className="text-sm text-[#899581] py-8 text-center">Loading addresses…</p>}

      {!loading && addresses.length === 0 && (
        <div className="bg-white border border-[#CDBBAD]/50 rounded-xl py-14 text-center">
          <MapPin size={28} className="mx-auto text-[#CDBBAD] mb-3" />
          <p className="text-sm text-[#899581]">No saved addresses yet.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {addresses.map((a) => (
          <div key={a.id} className="bg-white border border-[#CDBBAD]/50 rounded-xl p-5">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[#11100E]">{a.label}</span>
                {a.is_default && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                    <Check size={10} /> Default
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => openEdit(a)} className="p-1.5 rounded-lg text-[#5D1C34] hover:bg-[#5D1C34]/10 transition-colors">
                  <Pencil size={14} />
                </button>
                <button onClick={() => handleDelete(a)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <p className="text-sm text-[#11100E] font-medium">{a.full_name}</p>
            <p className="text-xs text-[#899581] mt-1">
              {a.address_line1}
              {a.address_line2 ? `, ${a.address_line2}` : ""}, {a.city}, {a.state}
              {a.zip_code ? ` ${a.zip_code}` : ""}
              {a.country ? `, ${a.country}` : ""}
            </p>
            <p className="text-xs text-[#899581] mt-1">{a.phone}</p>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="bg-white border border-[#CDBBAD]/50 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-[#11100E] mb-4">
            {editing ? "Edit Address" : "Add Address"}
          </h3>
          <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Label" value={form.label} onChange={(e) => set("label", e.target.value)} placeholder="Home, Work, etc." required />
            <Input label="Full Name" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} required />
            <Input label="Phone" type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} required />
            <div className="sm:col-span-2">
              <Input label="Address Line 1" value={form.address_line1} onChange={(e) => set("address_line1", e.target.value)} required />
            </div>
            <div className="sm:col-span-2">
              <Input label="Address Line 2 (optional)" value={form.address_line2} onChange={(e) => set("address_line2", e.target.value)} />
            </div>
            <Input label="City" value={form.city} onChange={(e) => set("city", e.target.value)} required />
            <Input label="State / Province" value={form.state} onChange={(e) => set("state", e.target.value)} required />
            <Input label="Postal Code" value={form.zip_code} onChange={(e) => set("zip_code", e.target.value)} />
            <Input label="Country" value={form.country} onChange={(e) => set("country", e.target.value)} />
            <label className="flex items-center gap-2 sm:col-span-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_default}
                onChange={(e) => set("is_default", e.target.checked)}
                className="accent-[#5D1C34]"
              />
              <span className="text-sm text-[#11100E]">Set as default address</span>
            </label>
            <div className="flex gap-3 sm:col-span-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 border border-[#CDBBAD] text-[#899581] py-2.5 rounded-xl text-sm hover:bg-[#F0E9E3] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-[#5D1C34] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-[#4a1628] disabled:opacity-60 transition-colors"
              >
                {saving ? "Saving…" : "Save Address"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
