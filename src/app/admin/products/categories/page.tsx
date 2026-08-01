"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { categories as initialCategories } from "@/data/categories";
import type { Category } from "@/types";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";

export default function AdminCategoriesPage() {
  const [cats, setCats] = useState<Category[]>(initialCategories);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", description: "" });

  const openAdd = () => {
    setEditTarget(null);
    setForm({ name: "", slug: "", description: "" });
    setModalOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditTarget(cat);
    setForm({ name: cat.name, slug: cat.slug, description: cat.description });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (editTarget) {
      setCats((prev) =>
        prev.map((c) =>
          c.id === editTarget.id ? { ...c, ...form } : c
        )
      );
    } else {
      setCats((prev) => [
        ...prev,
        {
          id: `cat-${Date.now()}`,
          ...form,
          image: "",
          productCount: 0,
        },
      ]);
    }
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this category?")) {
      setCats((prev) => prev.filter((c) => c.id !== id));
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-[#11100E]">Product Categories</h1>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 bg-[#5D1C34] text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-[#4a1628] transition-colors"
        >
          <Plus size={14} />
          Add Category
        </button>
      </div>

      <div className="bg-white rounded-xl border border-[#CDBBAD]/50 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#F0E9E3]">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[#899581]">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[#899581] hidden sm:table-cell">
                Slug
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[#899581]">
                Products
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[#899581]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0E9E3]">
            {cats.map((cat) => (
              <tr key={cat.id} className="hover:bg-[#F0E9E3]/30 transition-colors">
                <td className="px-4 py-3 font-medium text-[#11100E] text-sm">
                  {cat.name}
                </td>
                <td className="px-4 py-3 text-xs font-mono text-[#899581] hidden sm:table-cell">
                  {cat.slug}
                </td>
                <td className="px-4 py-3 text-xs text-[#899581]">
                  {cat.productCount ?? 0}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-3">
                    <button
                      onClick={() => openEdit(cat)}
                      className="flex items-center gap-1 text-xs text-[#5D1C34] hover:underline"
                    >
                      <Pencil size={12} />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(cat.id)}
                      className="flex items-center gap-1 text-xs text-red-500 hover:underline"
                    >
                      <Trash2 size={12} />
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? "Edit Category" : "Add Category"}
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
          <Input
            label="Slug"
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
          />
          <Input
            label="Description"
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
          />
          <div className="flex gap-3">
            <button
              onClick={() => setModalOpen(false)}
              className="flex-1 border border-[#CDBBAD] text-[#899581] py-2.5 rounded-xl text-sm hover:bg-[#F0E9E3] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 bg-[#5D1C34] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-[#4a1628] transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
