"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Eye, Globe, FileText } from "lucide-react";
import { cmsApi } from "@/lib/api";
import { getAdminSession } from "@/lib/adminAuth";
import type { CMSPage } from "@/lib/cms-store";

function slugToPath(slug: string): string {
  const s = slug.replace(/^\//, "");
  return s ? `/pages/${s}` : "/";
}

export default function AdminPagesPage() {
  const router = useRouter();
  const [pages, setPages] = useState<CMSPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [creating, setCreating] = useState(false);

  const load = () => {
    cmsApi
      .list()
      .then((data) => setPages(data))
      .catch((e) => setError(e.message ?? "Failed to load pages."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    const token = getAdminSession()?.id ?? null;
    if (!token) return;
    setCreating(true);
    setError("");
    try {
      const page = await cmsApi.create(
        { title: "New Page", slug: `new-page-${Date.now()}`, status: "draft", blocks: [] },
        token
      );
      router.push(`/admin/pages/${page.id}/edit`);
    } catch (e: any) {
      setError(e.message ?? "Failed to create page.");
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    const token = getAdminSession()?.id ?? null;
    if (!token) return;
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setError("");
    try {
      await cmsApi.delete(id, token);
      load();
    } catch (e: any) {
      setError(e.message ?? "Failed to delete page.");
    }
  };

  const published = pages.filter((p) => p.status === "published");
  const drafts    = pages.filter((p) => p.status === "draft");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#11100E]">Pages</h1>
          <p className="text-xs text-[#899581] mt-0.5">Manage all site pages with the visual page builder</p>
        </div>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="flex items-center gap-1.5 bg-[#5D1C34] text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-[#4a1628] disabled:opacity-60 transition-colors"
        >
          <Plus size={14} /> {creating ? "Creating…" : "New Page"}
        </button>
      </div>

      {error && (
        <div className="mb-4 text-center py-3 text-red-500 text-sm bg-red-50 rounded-xl border border-red-200">
          {error}
        </div>
      )}

      {loading && (
        <div className="text-center py-20 text-[#899581] text-sm">Loading pages…</div>
      )}

      {!loading && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: "Total Pages",  value: pages.length },
              { label: "Published",    value: published.length },
              { label: "Drafts",       value: drafts.length },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white rounded-xl border border-[#CDBBAD]/50 p-4 text-center">
                <p className="text-2xl font-bold text-[#11100E]">{value}</p>
                <p className="text-xs text-[#899581] mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-[#CDBBAD]/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#F0E9E3]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#899581]">Title</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#899581] hidden sm:table-cell">Slug</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#899581] hidden md:table-cell">Blocks</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#899581]">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#899581]">Updated</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#899581]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0E9E3]">
                  {pages.map((page) => (
                    <tr key={page.id} className="hover:bg-[#F0E9E3]/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {page.status === "published"
                            ? <Globe size={13} className="text-green-500 flex-shrink-0" />
                            : <FileText size={13} className="text-amber-500 flex-shrink-0" />}
                          <span className="font-medium text-[#11100E] text-sm">{page.title}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-[#899581] hidden sm:table-cell">{page.slug}</td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-xs text-[#899581]">
                          {page.blocks.length} block{page.blocks.length !== 1 ? "s" : ""}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          page.status === "published" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                        }`}>
                          {page.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-[#899581]">{new Date(page.updatedAt).toLocaleDateString()}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {page.status === "published" && (
                            <Link href={slugToPath(page.slug)} target="_blank" title="Preview" className="p-1.5 rounded-lg text-[#899581] hover:bg-[#F0E9E3] hover:text-[#11100E] transition-colors">
                              <Eye size={14} />
                            </Link>
                          )}
                          <Link href={`/admin/pages/${page.id}/edit`} title="Edit" className="p-1.5 rounded-lg text-[#5D1C34] hover:bg-[#5D1C34]/10 transition-colors">
                            <Pencil size={14} />
                          </Link>
                          <button onClick={() => handleDelete(page.id, page.title)} title="Delete" className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pages.length === 0 && (
              <div className="text-center py-16 text-[#899581] text-sm">
                No pages yet. Click &ldquo;New Page&rdquo; to create one.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
