"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { tutorialsApi } from "@/lib/api";
import { getAdminSession } from "@/lib/adminAuth";
import { slugify } from "@/lib/utils";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";

interface CategoryForm {
  name: string;
  slug: string;
  description: string;
  icon: string;
}

const emptyForm: CategoryForm = { name: "", slug: "", description: "", icon: "" };

export default function AdminTutorialCategoriesPage() {
  const [cats, setCats]           = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [form, setForm]           = useState<CategoryForm>(emptyForm);
  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState("");

  const loadCategories = () => {
    setLoading(true);
    tutorialsApi
      .categories()
      .then(setCats)
      .catch((e) => setError(e.message ?? "Failed to load categories."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadCategories(); }, []);

  const openAdd = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setSaveError("");
    setModalOpen(true);
  };

  const openEdit = (cat: any) => {
    setEditTarget(cat);
    setForm({ name: cat.name, slug: cat.slug, description: cat.description, icon: cat.icon ?? "" });
    setSaveError("");
    setModalOpen(true);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setForm((f) => ({ ...f, name, slug: editTarget ? f.slug : slugify(name) }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setSaveError("Name is required."); return; }
    if (!form.slug.trim()) { setSaveError("Slug is required."); return; }
    const token = getAdminSession()?.id ?? null;
    if (!token) { setSaveError("Not authenticated."); return; }
    setSaving(true);
    setSaveError("");
    try {
      const payload = {
        name:        form.name.trim(),
        slug:        form.slug.trim(),
        description: form.description.trim(),
        icon:        form.icon.trim(),
      };
      if (editTarget) {
        await tutorialsApi.updateCategory(editTarget.id, payload, token);
      } else {
        await tutorialsApi.createCategory(payload, token);
      }
      setModalOpen(false);
      loadCategories();
    } catch (err: any) {
      setSaveError(err.message ?? "Failed to save category.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? Tutorials in this category may be affected.`)) return;
    const token = getAdminSession()?.id ?? null;
    if (!token) return;
    try {
      await tutorialsApi.deleteCategory(id, token);
      setCats((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      alert(err.message ?? "Failed to delete category.");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#11100E]">Tutorial Categories</h1>
          <p className="text-xs text-[#899581] mt-0.5">{cats.length} categories</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 bg-[#5D1C34] text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-[#4a1628] transition-colors"
        >
          <Plus size={14} /> Add Category
        </button>
      </div>

      {loading && (
        <div className="text-center py-16 text-[#899581] text-sm">Loading categories…</div>
      )}

      {error && (
        <div className="text-center py-8 text-red-500 text-sm bg-red-50 rounded-xl border border-red-200">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="bg-white rounded-xl border border-[#CDBBAD]/50 overflow-hidden">
          {cats.length === 0 ? (
            <div className="text-center py-16 text-[#899581] text-sm">
              No categories yet.{" "}
              <button onClick={openAdd} className="text-[#5D1C34] hover:underline">
                Add the first one →
              </button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-[#F0E9E3]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#899581]">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#899581] hidden sm:table-cell">Slug</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#899581] hidden md:table-cell">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#899581]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0E9E3]">
                {cats.map((cat) => (
                  <tr key={cat.id} className="hover:bg-[#F0E9E3]/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-[#11100E] text-sm">
                      {cat.icon && <span className="mr-2">{cat.icon}</span>}
                      {cat.name}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-[#899581] hidden sm:table-cell">
                      {cat.slug}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#899581] hidden md:table-cell line-clamp-1">
                      {cat.description || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        <button
                          onClick={() => openEdit(cat)}
                          className="flex items-center gap-1 text-xs text-[#5D1C34] hover:underline"
                        >
                          <Pencil size={12} /> Edit
                        </button>
                        <button
                          onClick={() => handleDelete(cat.id, cat.name)}
                          className="flex items-center gap-1 text-xs text-red-500 hover:underline"
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

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
            onChange={handleNameChange}
            required
          />
          <Input
            label="Slug"
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
            required
          />
          <Input
            label="Icon (emoji)"
            value={form.icon}
            onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
            placeholder="🏠"
          />
          <Input
            label="Description"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
          {saveError && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {saveError}
            </p>
          )}
          <div className="flex gap-3">
            <button
              onClick={() => setModalOpen(false)}
              className="flex-1 border border-[#CDBBAD] text-[#899581] py-2.5 rounded-xl text-sm hover:bg-[#F0E9E3] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-[#5D1C34] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-[#4a1628] disabled:opacity-60 transition-colors"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
