"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, AlertCircle, CheckCircle, Box, Edit2, X } from "lucide-react";
import Input from "@/components/ui/Input";
import { brandsApi } from "@/lib/api";
import { getAdminSession } from "@/lib/adminAuth";
import { slugify } from "@/lib/utils";

interface BrandItem {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
}

interface FormState {
  name: string;
  slug: string;
  logo: string;
}

const EMPTY_FORM: FormState = { name: "", slug: "", logo: "" };

export default function AdminBrandsPage() {
  const [brands, setBrands] = useState<BrandItem[]>([]);
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

  const fetchBrands = useCallback(async () => {
    setLoadError("");
    try {
      const data = await brandsApi.list();
      setBrands(data as BrandItem[]);
    } catch (err: any) {
      setLoadError(err.message ?? "Failed to load brands.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  // ─── Create ────────────────────────────────────────────────────────────────

  const setCreateField = (key: keyof FormState, val: string) => {
    if (key === "name") {
      setCreateForm((f) => ({ ...f, name: val, slug: slugify(val) }));
    } else {
      setCreateForm((f) => ({ ...f, [key]: val }));
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
      await brandsApi.create(
        {
          name: createForm.name.trim(),
          slug: createForm.slug.trim(),
          logo: createForm.logo.trim() || null,
        },
        token
      );
      setCreateForm(EMPTY_FORM);
      setShowCreate(false);
      flash("Brand created.");
      await fetchBrands();
    } catch (err: any) {
      setCreateError(err.message ?? "Failed to create brand.");
    } finally {
      setCreateLoading(false);
    }
  };

  // ─── Edit ──────────────────────────────────────────────────────────────────

  const startEdit = (brand: BrandItem) => {
    setEditId(brand.id);
    setEditForm({ name: brand.name, slug: brand.slug, logo: brand.logo ?? "" });
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
      await brandsApi.update(
        editId,
        {
          name: editForm.name.trim(),
          logo: editForm.logo.trim() || null,
        },
        token
      );
      setEditId(null);
      flash("Brand updated.");
      await fetchBrands();
    } catch (err: any) {
      setEditError(err.message ?? "Failed to update brand.");
    } finally {
      setEditLoading(false);
    }
  };

  // ─── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = async (brand: BrandItem) => {
    if (!confirm(`Delete brand "${brand.name}"? This cannot be undone.`)) return;
    const token = getAdminSession()?.id ?? null;
    if (!token) { setDeleteError("Not authenticated."); return; }
    setDeletingId(brand.id);
    setDeleteError("");
    try {
      await brandsApi.delete(brand.id, token);
      flash("Brand deleted.");
      await fetchBrands();
    } catch (err: any) {
      setDeleteError(err.message ?? "Failed to delete brand.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#11100E]">Brands</h1>
          <p className="text-xs text-[#899581] mt-0.5">{brands.length} total</p>
        </div>
        <button
          onClick={() => { setShowCreate((v) => !v); setCreateError(""); setCreateForm(EMPTY_FORM); }}
          className="flex items-center gap-1.5 bg-[#5D1C34] text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-[#4a1628] transition-colors"
        >
          <Plus size={14} /> Add Brand
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
            <h2 className="font-semibold text-[#11100E]">New Brand</h2>
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
                label="Logo URL"
                value={createForm.logo}
                onChange={(e) => setCreateField("logo", e.target.value)}
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
                {createLoading ? "Creating…" : "Create Brand"}
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
          {brands.length === 0 ? (
            <div className="text-center py-12 text-[#899581] text-sm">
              No brands yet. Add one above.
            </div>
          ) : (
            <div className="divide-y divide-[#F0E9E3]">
              {brands.map((brand) => (
                <div key={brand.id}>
                  {editId === brand.id ? (
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
                            label="Logo URL"
                            value={editForm.logo}
                            onChange={(e) => setEditField("logo", e.target.value)}
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
                        {brand.logo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={brand.logo}
                            alt={brand.name}
                            className="w-6 h-6 object-contain"
                          />
                        ) : (
                          <Box size={14} className="text-[#5D1C34]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#11100E] truncate">{brand.name}</p>
                        <p className="text-xs text-[#899581]">{brand.slug}</p>
                      </div>
                      <div className="flex items-center gap-1 ml-auto flex-shrink-0">
                        <button
                          onClick={() => startEdit(brand)}
                          className="p-1.5 rounded-lg text-[#5D1C34] hover:bg-[#5D1C34]/10 transition-colors"
                          aria-label={`Edit ${brand.name}`}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(brand)}
                          disabled={deletingId === brand.id}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-40 transition-colors"
                          aria-label={`Delete ${brand.name}`}
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
