"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, AlertCircle, CheckCircle, Tag, Edit2, X } from "lucide-react";
import Input from "@/components/ui/Input";
import { categoriesApi, type Category as ApiCategory } from "@/lib/api";
import { getAdminSession } from "@/lib/adminAuth";
import { slugify } from "@/lib/utils";

function errMsg(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message ?? fallback;
  if (typeof err === "object" && err !== null && "message" in err) {
    const message = err.message;
    if (typeof message === "string") return message;
  }
  return fallback;
}

interface FormState {
  name: string;
  slug: string;
  description: string;
  image: string;
}

const EMPTY_FORM: FormState = { name: "", slug: "", description: "", image: "" };

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<FormState>(EMPTY_FORM);
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");

  // Edit form
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  // Delete
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");

  const [successMsg, setSuccessMsg] = useState("");

  const flash = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const fetchCategories = useCallback(async () => {
    setLoadError("");
    try {
      const data = await categoriesApi.list();
      setCategories(data);
    } catch (err) {
      setLoadError(errMsg(err, "Failed to load categories."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // ─── Create ────────────────────────────────────────────────────────────────

  const setCreateField = (key: keyof FormState, val: string) => {
    setCreateForm((f) => ({ ...f, [key]: val }));
    if (key === "name") {
      setCreateForm((f) => ({ ...f, name: val, slug: slugify(val) }));
    }
  };

  const validateCreate = () => {
    const e: Record<string, string> = {};
    if (!createForm.name.trim()) e.name = "Required";
    if (!createForm.slug.trim()) e.slug = "Required";
    setCreateErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCreate()) return;
    const token = getAdminSession()?.id ?? null;
    if (!token) { setCreateError("Not authenticated."); return; }
    setCreateLoading(true);
    setCreateError("");
    try {
      await categoriesApi.create(
        {
          name: createForm.name.trim(),
          slug: createForm.slug.trim(),
          description: createForm.description.trim(),
          image: createForm.image.trim(),
        },
        token
      );
      setCreateForm(EMPTY_FORM);
      setShowCreate(false);
      flash("Category created.");
      await fetchCategories();
    } catch (err) {
      setCreateError(errMsg(err, "Failed to create category."));
    } finally {
      setCreateLoading(false);
    }
  };

  // ─── Edit ──────────────────────────────────────────────────────────────────

  const startEdit = (cat: ApiCategory) => {
    setEditId(cat.id);
    setEditForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      image: cat.image,
    });
    setEditErrors({});
    setEditError("");
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditError("");
  };

  const setEditField = (key: keyof FormState, val: string) =>
    setEditForm((f) => ({ ...f, [key]: val }));

  const validateEdit = () => {
    const e: Record<string, string> = {};
    if (!editForm.name.trim()) e.name = "Required";
    setEditErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEdit() || !editId) return;
    const token = getAdminSession()?.id ?? null;
    if (!token) { setEditError("Not authenticated."); return; }
    setEditLoading(true);
    setEditError("");
    try {
      await categoriesApi.update(
        editId,
        {
          name: editForm.name.trim(),
          description: editForm.description.trim(),
          image: editForm.image.trim(),
        },
        token
      );
      setEditId(null);
      flash("Category updated.");
      await fetchCategories();
    } catch (err) {
      setEditError(errMsg(err, "Failed to update category."));
    } finally {
      setEditLoading(false);
    }
  };

  // ─── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = async (cat: ApiCategory) => {
    if (!confirm(`Delete category "${cat.name}"? This cannot be undone.`)) return;
    const token = getAdminSession()?.id ?? null;
    if (!token) { setDeleteError("Not authenticated."); return; }
    setDeletingId(cat.id);
    setDeleteError("");
    try {
      await categoriesApi.delete(cat.id, token);
      flash("Category deleted.");
      await fetchCategories();
    } catch (err) {
      setDeleteError(errMsg(err, "Failed to delete category."));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#11100E]">Categories</h1>
          <p className="text-xs text-[#899581] mt-0.5">{categories.length} total</p>
        </div>
        <button
          onClick={() => { setShowCreate((v) => !v); setCreateError(""); setCreateForm(EMPTY_FORM); }}
          className="flex items-center gap-1.5 bg-[#5D1C34] text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-[#4a1628] transition-colors"
        >
          <Plus size={14} /> Add Category
        </button>
      </div>

      {/* Global success */}
      {successMsg && (
        <div className="mb-4 flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg">
          <CheckCircle size={14} />
          {successMsg}
        </div>
      )}

      {/* Delete error */}
      {deleteError && (
        <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          <AlertCircle size={14} className="flex-shrink-0" />
          {deleteError}
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="mb-5 bg-white rounded-xl border border-[#CDBBAD]/50 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-[#11100E]">New Category</h2>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="text-[#899581] hover:text-[#11100E] transition-colors"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          {createError && (
            <div className="mb-3 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
              <AlertCircle size={13} className="flex-shrink-0" />
              {createError}
            </div>
          )}

          <form onSubmit={handleCreate} noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <Input
                label="Name"
                value={createForm.name}
                onChange={(e) => setCreateField("name", e.target.value)}
                error={createErrors.name}
                required
              />
              <Input
                label="Slug"
                value={createForm.slug}
                onChange={(e) => setCreateField("slug", e.target.value)}
                error={createErrors.slug}
                required
                hint="Auto-generated from name"
              />
              <Input
                label="Description"
                value={createForm.description}
                onChange={(e) => setCreateField("description", e.target.value)}
              />
              <Input
                label="Image URL"
                value={createForm.image}
                onChange={(e) => setCreateField("image", e.target.value)}
                placeholder="https://…"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="border border-[#CDBBAD] text-[#899581] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#F0E9E3] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createLoading}
                className="bg-[#5D1C34] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#4a1628] disabled:opacity-60 transition-colors"
              >
                {createLoading ? "Creating…" : "Create Category"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="text-center py-12 text-[#899581] text-sm">Loading…</div>
      ) : loadError ? (
        <div className="text-center py-12 text-red-500 text-sm">{loadError}</div>
      ) : (
        <div className="bg-white rounded-xl border border-[#CDBBAD]/50 overflow-hidden">
          {categories.length === 0 ? (
            <div className="text-center py-12 text-[#899581] text-sm">
              No categories yet. Add one above.
            </div>
          ) : (
            <div className="divide-y divide-[#F0E9E3]">
              {categories.map((cat) => (
                <div key={cat.id}>
                  {editId === cat.id ? (
                    /* Inline edit row */
                    <div className="p-4">
                      {editError && (
                        <div className="mb-3 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
                          <AlertCircle size={13} className="flex-shrink-0" />
                          {editError}
                        </div>
                      )}
                      <form onSubmit={handleEdit} noValidate>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                          <Input
                            label="Name"
                            value={editForm.name}
                            onChange={(e) => setEditField("name", e.target.value)}
                            error={editErrors.name}
                            required
                          />
                          <Input
                            label="Slug"
                            value={editForm.slug}
                            readOnly
                            hint="Cannot be changed"
                          />
                          <Input
                            label="Description"
                            value={editForm.description}
                            onChange={(e) => setEditField("description", e.target.value)}
                          />
                          <Input
                            label="Image URL"
                            value={editForm.image}
                            onChange={(e) => setEditField("image", e.target.value)}
                            placeholder="https://…"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="border border-[#CDBBAD] text-[#899581] px-3 py-1.5 rounded-lg text-sm hover:bg-[#F0E9E3] transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={editLoading}
                            className="bg-[#5D1C34] text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-[#4a1628] disabled:opacity-60 transition-colors"
                          >
                            {editLoading ? "Saving…" : "Save"}
                          </button>
                        </div>
                      </form>
                    </div>
                  ) : (
                    /* Normal row */
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className="w-8 h-8 rounded-lg bg-[#F0E9E3] flex items-center justify-center flex-shrink-0">
                        <Tag size={14} className="text-[#5D1C34]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#11100E] truncate">{cat.name}</p>
                        <p className="text-xs text-[#899581]">
                          {cat.slug}
                          {cat.product_count > 0 && (
                            <span className="ml-2 text-[#A67D45]">
                              {cat.product_count} product{cat.product_count !== 1 ? "s" : ""}
                            </span>
                          )}
                        </p>
                      </div>
                      {cat.description && (
                        <p className="text-xs text-[#899581] hidden sm:block max-w-xs truncate">
                          {cat.description}
                        </p>
                      )}
                      <div className="flex items-center gap-1 ml-auto flex-shrink-0">
                        <button
                          onClick={() => startEdit(cat)}
                          className="p-1.5 rounded-lg text-[#5D1C34] hover:bg-[#5D1C34]/10 transition-colors"
                          aria-label={`Edit ${cat.name}`}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(cat)}
                          disabled={deletingId === cat.id}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-40 transition-colors"
                          aria-label={`Delete ${cat.name}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
