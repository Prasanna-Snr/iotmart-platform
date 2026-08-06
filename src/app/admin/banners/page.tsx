"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, GripVertical } from "lucide-react";
import { bannersApi } from "@/lib/api";
import { getAdminSession } from "@/lib/adminAuth";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";

interface BannerItem {
  id: string;
  title: string;
  subtitle: string;
  cta_text: string;
  cta_link: string;
  image: string;
  active: boolean;
  order: number;
}

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [editTarget, setEditTarget] = useState<BannerItem | null>(null);
  const [form, setForm] = useState({ title: "", subtitle: "", cta_text: "", cta_link: "", image: "", active: true, order: 1 });

  const token = () => getAdminSession()?.id ?? null;

  const load = () => {
    const t = token();
    if (!t) {
      setError("Not authenticated.");
      setLoading(false);
      return;
    }
    bannersApi
      .list()
      .then((data) => setBanners(data))
      .catch((e) => setError(e.message ?? "Failed to load banners."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const openAdd = () => {
    setEditTarget(null);
    setForm({ title: "", subtitle: "", cta_text: "Shop Now", cta_link: "/products", image: "", active: true, order: banners.length + 1 });
    setModalOpen(true);
  };

  const openEdit = (b: BannerItem) => {
    setEditTarget(b);
    setForm({ title: b.title, subtitle: b.subtitle, cta_text: b.cta_text, cta_link: b.cta_link, image: b.image, active: b.active, order: b.order });
    setModalOpen(true);
  };

  const handleSave = async () => {
    const t = token();
    if (!t) return;
    setSaving(true);
    setError("");
    try {
      if (editTarget) {
        await bannersApi.update(editTarget.id, form, t);
      } else {
        await bannersApi.create(form, t);
      }
      setModalOpen(false);
      load();
    } catch (e: any) {
      setError(e.message ?? "Failed to save banner.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const t = token();
    if (!t) return;
    if (!confirm("Delete this banner?")) return;
    setError("");
    try {
      await bannersApi.delete(id, t);
      load();
    } catch (e: any) {
      setError(e.message ?? "Failed to delete banner.");
    }
  };

  const toggleActive = async (b: BannerItem) => {
    const t = token();
    if (!t) return;
    setError("");
    try {
      await bannersApi.update(b.id, { active: !b.active }, t);
      load();
    } catch (e: any) {
      setError(e.message ?? "Failed to update banner.");
    }
  };

  const set = (k: string, v: string | boolean | number) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-[#11100E]">Banners</h1>
        <button onClick={openAdd} className="flex items-center gap-1.5 bg-[#5D1C34] text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-[#4a1628] transition-colors">
          <Plus size={14} /> Add Banner
        </button>
      </div>

      {loading && (
        <div className="text-center py-16 text-[#899581] text-sm">Loading banners…</div>
      )}

      {error && (
        <div className="mb-4 text-center py-4 text-red-500 text-sm bg-red-50 rounded-xl border border-red-200">
          {error}
        </div>
      )}

      {!loading && (
        <div className="space-y-4">
          {[...banners].sort((a, b) => a.order - b.order).map((banner) => (
            <div key={banner.id} className="bg-white rounded-xl border border-[#CDBBAD]/50 overflow-hidden">
              <div className="flex items-center gap-4 p-4">
                <GripVertical size={16} className="text-[#CDBBAD] cursor-grab flex-shrink-0" />
                {/* Preview */}
                <div className="relative w-32 h-16 rounded-lg overflow-hidden bg-[#F0E9E3] flex-shrink-0">
                  {banner.image ? (
                    <Image src={banner.image} alt={banner.title} fill sizes="128px" className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#CDBBAD] text-xs">No image</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#11100E] text-sm line-clamp-1">{banner.title}</p>
                  <p className="text-xs text-[#899581] line-clamp-1">{banner.subtitle}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-[#A67D45] font-medium">{banner.cta_text}</span>
                    <span className="text-xs text-[#899581]">→ {banner.cta_link}</span>
                    <span className="text-xs text-[#CDBBAD]">Order: {banner.order}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => toggleActive(banner)}
                    title={banner.active ? "Deactivate" : "Activate"}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${banner.active ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-[#F0E9E3] text-[#899581] hover:bg-green-50 hover:text-green-600"}`}
                  >
                    {banner.active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                    {banner.active ? "Active" : "Inactive"}
                  </button>
                  <button onClick={() => openEdit(banner)} className="p-2 rounded-lg text-[#5D1C34] hover:bg-[#5D1C34]/10 transition-colors"><Pencil size={14} /></button>
                  <button onClick={() => handleDelete(banner.id)} className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
          {banners.length === 0 && (
            <div className="bg-white rounded-xl border border-[#CDBBAD]/50 text-center py-16 text-[#899581] text-sm">
              No banners yet. Add one to get started.
            </div>
          )}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editTarget ? "Edit Banner" : "Add Banner"}>
        <div className="space-y-4">
          <Input label="Title" value={form.title} onChange={(e) => set("title", e.target.value)} required />
          <Input label="Subtitle" value={form.subtitle} onChange={(e) => set("subtitle", e.target.value)} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="CTA Button Text" value={form.cta_text} onChange={(e) => set("cta_text", e.target.value)} />
            <Input label="CTA Link" value={form.cta_link} onChange={(e) => set("cta_link", e.target.value)} />
          </div>
          <Input label="Image URL" value={form.image} onChange={(e) => set("image", e.target.value)} placeholder="https://images.unsplash.com/…" />
          <Input label="Display Order" type="number" value={String(form.order)} onChange={(e) => set("order", Number(e.target.value))} />
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} className="accent-[#5D1C34]" />
            <span className="text-sm text-[#11100E]">Active (visible on store)</span>
          </label>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="flex-1 border border-[#CDBBAD] text-[#899581] py-2.5 rounded-xl text-sm hover:bg-[#F0E9E3] transition-colors">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 bg-[#5D1C34] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-[#4a1628] disabled:opacity-60 transition-colors">{saving ? "Saving…" : "Save Banner"}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
