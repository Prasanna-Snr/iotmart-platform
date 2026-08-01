"use client";

import { useState } from "react";
import Image from "next/image";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, GripVertical } from "lucide-react";
import { banners as initialBanners } from "@/data/orders";
import type { Banner } from "@/types";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<Banner[]>(initialBanners);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Banner | null>(null);
  const [form, setForm] = useState({ title: "", subtitle: "", ctaText: "", ctaLink: "", image: "", active: true, order: 1 });

  const openAdd = () => {
    setEditTarget(null);
    setForm({ title: "", subtitle: "", ctaText: "Shop Now", ctaLink: "/products", image: "", active: true, order: banners.length + 1 });
    setModalOpen(true);
  };

  const openEdit = (b: Banner) => {
    setEditTarget(b);
    setForm({ title: b.title, subtitle: b.subtitle, ctaText: b.ctaText, ctaLink: b.ctaLink, image: b.image, active: b.active, order: b.order });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (editTarget) {
      setBanners((prev) => prev.map((b) => b.id === editTarget.id ? { ...b, ...form } : b));
    } else {
      setBanners((prev) => [...prev, { id: `banner-${Date.now()}`, ...form }]);
    }
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this banner?")) setBanners((prev) => prev.filter((b) => b.id !== id));
  };

  const toggleActive = (id: string) => {
    setBanners((prev) => prev.map((b) => b.id === id ? { ...b, active: !b.active } : b));
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

      <div className="space-y-4">
        {banners.sort((a, b) => a.order - b.order).map((banner) => (
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
                  <span className="text-xs text-[#A67D45] font-medium">{banner.ctaText}</span>
                  <span className="text-xs text-[#899581]">→ {banner.ctaLink}</span>
                  <span className="text-xs text-[#CDBBAD]">Order: {banner.order}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => toggleActive(banner.id)}
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

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editTarget ? "Edit Banner" : "Add Banner"}>
        <div className="space-y-4">
          <Input label="Title" value={form.title} onChange={(e) => set("title", e.target.value)} required />
          <Input label="Subtitle" value={form.subtitle} onChange={(e) => set("subtitle", e.target.value)} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="CTA Button Text" value={form.ctaText} onChange={(e) => set("ctaText", e.target.value)} />
            <Input label="CTA Link" value={form.ctaLink} onChange={(e) => set("ctaLink", e.target.value)} />
          </div>
          <Input label="Image URL" value={form.image} onChange={(e) => set("image", e.target.value)} placeholder="https://images.unsplash.com/…" />
          <Input label="Display Order" type="number" value={String(form.order)} onChange={(e) => set("order", Number(e.target.value))} />
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} className="accent-[#5D1C34]" />
            <span className="text-sm text-[#11100E]">Active (visible on store)</span>
          </label>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="flex-1 border border-[#CDBBAD] text-[#899581] py-2.5 rounded-xl text-sm hover:bg-[#F0E9E3] transition-colors">Cancel</button>
            <button onClick={handleSave} className="flex-1 bg-[#5D1C34] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-[#4a1628] transition-colors">Save Banner</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
