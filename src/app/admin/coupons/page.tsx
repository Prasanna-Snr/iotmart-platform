"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Ticket } from "lucide-react";
import { couponsApi } from "@/lib/api";
import { getAdminSession } from "@/lib/adminAuth";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";

interface CouponItem {
  id: string;
  code: string;
  description: string;
  percent_off: number | null;
  fixed_amount: number | null;
  min_subtotal: number;
  max_uses: number | null;
  used_count: number;
  max_uses_per_user: number | null;
  active: boolean;
  starts_at: string | null;
  expires_at: string | null;
  created_at: string;
}

const emptyForm = {
  code: "",
  description: "",
  percent_off: "",
  fixed_amount: "",
  min_subtotal: "",
  max_uses: "",
  max_uses_per_user: "",
  active: true,
  expires_at: "",
};

function formatMoney(v: number | null | undefined): string {
  if (v == null) return "—";
  return `$${Number(v).toFixed(2)}`;
}

function formatDate(v: string | null | undefined): string {
  if (!v) return "Never";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "Invalid";
  return d.toLocaleDateString();
}

function discountLabel(c: CouponItem): string {
  if (c.percent_off != null) return `${c.percent_off}% off`;
  if (c.fixed_amount != null) return `${formatMoney(c.fixed_amount)} off`;
  return "—";
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [editTarget, setEditTarget] = useState<CouponItem | null>(null);
  const [form, setForm] = useState(emptyForm);

  const token = () => getAdminSession()?.id ?? null;

  const load = () => {
    const t = token();
    if (!t) {
      setError("Not authenticated.");
      setLoading(false);
      return;
    }
    couponsApi
      .list(t)
      .then((data) => setCoupons(data))
      .catch((e) => setError(e.message ?? "Failed to load coupons."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const openAdd = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (c: CouponItem) => {
    setEditTarget(c);
    setForm({
      code: c.code,
      description: c.description,
      percent_off: c.percent_off != null ? String(c.percent_off) : "",
      fixed_amount: c.fixed_amount != null ? String(c.fixed_amount) : "",
      min_subtotal: c.min_subtotal ? String(c.min_subtotal) : "",
      max_uses: c.max_uses != null ? String(c.max_uses) : "",
      max_uses_per_user: c.max_uses_per_user != null ? String(c.max_uses_per_user) : "",
      active: c.active,
      expires_at: c.expires_at ? c.expires_at.slice(0, 10) : "",
    });
    setModalOpen(true);
  };

  const buildPayload = () => {
    const p: Record<string, any> = {
      code: form.code.trim().toUpperCase(),
      description: form.description,
      min_subtotal: form.min_subtotal ? Number(form.min_subtotal) : 0,
      active: form.active,
    };
    if (form.percent_off) p.percent_off = Number(form.percent_off);
    if (form.fixed_amount) p.fixed_amount = Number(form.fixed_amount);
    if (form.max_uses) p.max_uses = Number(form.max_uses);
    if (form.max_uses_per_user) p.max_uses_per_user = Number(form.max_uses_per_user);
    if (form.expires_at) p.expires_at = new Date(form.expires_at + "T23:59:59Z").toISOString();
    return p;
  };

  const handleSave = async () => {
    const t = token();
    if (!t) return;
    if (!form.code.trim()) { setError("Code is required."); return; }
    if (!form.percent_off && !form.fixed_amount) { setError("Set either percent_off or fixed_amount."); return; }
    if (form.percent_off && form.fixed_amount) { setError("Set either percent_off or fixed_amount, not both."); return; }
    setSaving(true);
    setError("");
    try {
      if (editTarget) {
        await couponsApi.update(editTarget.id, buildPayload(), t);
      } else {
        await couponsApi.create(buildPayload(), t);
      }
      setModalOpen(false);
      load();
    } catch (e: any) {
      setError(e.message ?? "Failed to save coupon.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const t = token();
    if (!t) return;
    if (!confirm("Delete this coupon? Existing orders keep their discount.")) return;
    setError("");
    try {
      await couponsApi.delete(id, t);
      load();
    } catch (e: any) {
      setError(e.message ?? "Failed to delete coupon.");
    }
  };

  const toggleActive = async (c: CouponItem) => {
    const t = token();
    if (!t) return;
    setError("");
    try {
      await couponsApi.update(c.id, { active: !c.active }, t);
      load();
    } catch (e: any) {
      setError(e.message ?? "Failed to update coupon.");
    }
  };

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-[#11100E]">Coupons</h1>
        <button onClick={openAdd} className="flex items-center gap-1.5 bg-[#5D1C34] text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-[#4a1628] transition-colors">
          <Plus size={14} /> Add Coupon
        </button>
      </div>

      {loading && (
        <div className="text-center py-16 text-[#899581] text-sm">Loading coupons…</div>
      )}

      {error && (
        <div className="mb-4 text-center py-4 text-red-500 text-sm bg-red-50 rounded-xl border border-red-200">
          {error}
        </div>
      )}

      {!loading && (
        <div className="bg-white rounded-xl border border-[#CDBBAD]/50 overflow-hidden">
          <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-3 text-xs font-semibold text-[#899581] uppercase tracking-wide bg-[#F0E9E3]/60">
            <div className="col-span-3">Code</div>
            <div className="col-span-3">Discount</div>
            <div className="col-span-2">Min. subtotal</div>
            <div className="col-span-2">Usage</div>
            <div className="col-span-1">Expires</div>
            <div className="col-span-1">Status</div>
          </div>
          {coupons.map((c) => (
            <div key={c.id} className="grid grid-cols-2 md:grid-cols-12 gap-3 items-center px-4 py-3 border-t border-[#CDBBAD]/30 hover:bg-[#F0E9E3]/30 transition-colors">
              <div className="col-span-2 md:col-span-3">
                <p className="font-mono font-semibold text-[#5D1C34] text-sm">{c.code}</p>
                <p className="text-xs text-[#899581] line-clamp-1">{c.description || "—"}</p>
              </div>
              <div className="md:col-span-3">
                <p className="text-sm font-medium text-[#11100E]">{discountLabel(c)}</p>
                <p className="text-xs text-[#899581]">Per user: {c.max_uses_per_user ?? "∞"}</p>
              </div>
              <div className="md:col-span-2 text-sm text-[#899581]">{formatMoney(c.min_subtotal)}</div>
              <div className="md:col-span-2 text-sm text-[#899581]">{c.used_count}{c.max_uses != null ? ` / ${c.max_uses}` : ""}</div>
              <div className="md:col-span-1 text-xs text-[#899581]">{formatDate(c.expires_at)}</div>
              <div className="col-span-2 md:col-span-1 flex items-center justify-end gap-2">
                <button
                  onClick={() => toggleActive(c)}
                  title={c.active ? "Deactivate" : "Activate"}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${c.active ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-[#F0E9E3] text-[#899581] hover:bg-green-50 hover:text-green-600"}`}
                >
                  {c.active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                  <span className="hidden sm:inline">{c.active ? "Active" : "Inactive"}</span>
                </button>
                <button onClick={() => openEdit(c)} className="p-2 rounded-lg text-[#5D1C34] hover:bg-[#5D1C34]/10 transition-colors"><Pencil size={14} /></button>
                <button onClick={() => handleDelete(c.id)} className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
          {coupons.length === 0 && (
            <div className="text-center py-16 text-[#899581] text-sm flex flex-col items-center gap-2">
              <Ticket size={24} className="text-[#CDBBAD]" />
              No coupons yet. Create one to reward customers.
            </div>
          )}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editTarget ? "Edit Coupon" : "Add Coupon"}>
        <div className="space-y-4">
          <Input label="Code" value={form.code} onChange={(e) => set("code", e.target.value)} placeholder="SAVE20" required />
          <Input label="Description (shown to customers)" value={form.description} onChange={(e) => set("description", e.target.value)} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Percent off (%)" type="number" value={form.percent_off} onChange={(e) => set("percent_off", e.target.value)} placeholder="20" />
            <Input label="Fixed amount ($)" type="number" value={form.fixed_amount} onChange={(e) => set("fixed_amount", e.target.value)} placeholder="10" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Min. subtotal ($)" type="number" value={form.min_subtotal} onChange={(e) => set("min_subtotal", e.target.value)} placeholder="0" />
            <Input label="Expires (optional)" type="date" value={form.expires_at} onChange={(e) => set("expires_at", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Max total uses (blank = unlimited)" type="number" value={form.max_uses} onChange={(e) => set("max_uses", e.target.value)} />
            <Input label="Max uses per user (blank = unlimited)" type="number" value={form.max_uses_per_user} onChange={(e) => set("max_uses_per_user", e.target.value)} />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} className="accent-[#5D1C34]" />
            <span className="text-sm text-[#11100E]">Active (customers can use it)</span>
          </label>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="flex-1 border border-[#CDBBAD] text-[#899581] py-2.5 rounded-xl text-sm hover:bg-[#F0E9E3] transition-colors">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 bg-[#5D1C34] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-[#4a1628] disabled:opacity-60 transition-colors">{saving ? "Saving…" : "Save Coupon"}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
