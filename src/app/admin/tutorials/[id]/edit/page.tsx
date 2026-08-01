"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle, Trash2 } from "lucide-react";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Select from "@/components/ui/Select";
import { tutorialsApi } from "@/lib/api";
import { getAdminToken } from "@/lib/adminAuth";

const difficultyOptions = [
  { value: "Beginner",     label: "Beginner" },
  { value: "Intermediate", label: "Intermediate" },
  { value: "Advanced",     label: "Advanced" },
];

const langOptions = [
  { value: "cpp",        label: "C++ (Arduino)" },
  { value: "python",     label: "Python (MicroPython)" },
  { value: "javascript", label: "JavaScript" },
];

export default function AdminEditTutorialPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [saveError, setSaveError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({
    title: "", slug: "", short_description: "", description: "",
    difficulty: "Beginner", category_id: "", estimated_time: "",
    author: "", components: "", tags: "", source_code: "",
    code_language: "cpp", cover_image: "", featured: false, published: false,
  });

  useEffect(() => {
    tutorialsApi.categories().then(setCategories).catch(() => {});
  }, []);

  // Load tutorial by id — backend GET /{slug} also works by slug,
  // but admin edit uses id so we fetch list and find by id
  useEffect(() => {
    const token = getAdminToken();
    // fetch all and find by id (admin sees all)
    tutorialsApi
      .list({ page_size: 200 })
      .then((data) => {
        const tut = data.items.find((t: any) => t.id === id);
        if (!tut) { setError("Tutorial not found."); return; }
        setForm({
          title:             tut.title ?? "",
          slug:              tut.slug ?? "",
          short_description: tut.short_description ?? "",
          description:       tut.description ?? "",
          difficulty:        tut.difficulty ?? "Beginner",
          category_id:       tut.category?.id ?? "",
          estimated_time:    tut.estimated_time ?? "",
          author:            tut.author ?? "",
          components:        (tut.components ?? []).join(", "),
          tags:              (tut.tags ?? []).join(", "),
          source_code:       tut.source_code ?? "",
          code_language:     tut.code_language ?? "cpp",
          cover_image:       tut.cover_image ?? "",
          featured:          tut.featured ?? false,
          published:         tut.published ?? false,
        });
      })
      .catch((e) => setError(e.message ?? "Failed to load tutorial."))
      .finally(() => setLoading(false));
  }, [id]);

  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }));
  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getAdminToken();
    if (!token) { setSaveError("Not authenticated."); return; }
    setSaving(true);
    setSaveError("");
    try {
      await tutorialsApi.update(id, {
        title:             form.title.trim(),
        slug:              form.slug.trim(),
        short_description: form.short_description.trim(),
        description:       form.description.trim(),
        difficulty:        form.difficulty,
        estimated_time:    form.estimated_time.trim(),
        author:            form.author.trim(),
        components:        form.components.split(",").map((s) => s.trim()).filter(Boolean),
        tags:              form.tags.split(",").map((s) => s.trim()).filter(Boolean),
        source_code:       form.source_code,
        code_language:     form.code_language,
        cover_image:       form.cover_image.trim(),
        featured:          form.featured,
        published:         form.published,
      }, token);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setSaveError(err.message ?? "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this tutorial? This cannot be undone.")) return;
    const token = getAdminToken();
    if (!token) return;
    setDeleting(true);
    try {
      await tutorialsApi.delete(id, token);
      router.push("/admin/tutorials");
    } catch (err: any) {
      setSaveError(err.message ?? "Failed to delete.");
      setDeleting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-[#899581] text-sm">Loading…</div>;
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-[#899581] mb-3">{error}</p>
        <Link href="/admin/tutorials" className="text-[#5D1C34] text-sm hover:underline">← Back</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/tutorials" className="p-2 rounded-lg text-[#899581] hover:bg-white transition-colors" aria-label="Back">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-[#11100E]">Edit Tutorial</h1>
          <p className="text-xs text-[#899581] line-clamp-1">{form.title}</p>
        </div>
        {saved && (
          <span className="ml-auto flex items-center gap-1.5 text-green-600 text-sm font-medium">
            <CheckCircle size={15} /> Changes saved
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl border border-[#CDBBAD]/50 p-5 space-y-4">
              <h2 className="font-semibold text-[#11100E]">Basic Information</h2>
              <Input label="Title" value={form.title} onChange={(e) => set("title", e.target.value)} required />
              <Input label="Slug" value={form.slug} onChange={(e) => set("slug", e.target.value)} />
              <Input label="Short Description" value={form.short_description} onChange={(e) => set("short_description", e.target.value)} />
              <Textarea label="Full Description" value={form.description} onChange={(e) => set("description", e.target.value)} rows={4} />
              <Input label="Author" value={form.author} onChange={(e) => set("author", e.target.value)} />
              <Input label="Tags (comma-separated)" value={form.tags} onChange={(e) => set("tags", e.target.value)} />
              <Input label="Components (comma-separated)" value={form.components} onChange={(e) => set("components", e.target.value)} />
              <Input label="Cover Image URL" value={form.cover_image} onChange={(e) => set("cover_image", e.target.value)} placeholder="https://…" />
            </div>

            <div className="bg-white rounded-xl border border-[#CDBBAD]/50 p-5 space-y-4">
              <h2 className="font-semibold text-[#11100E]">Source Code</h2>
              <Select label="Language" options={langOptions} value={form.code_language} onChange={(e) => set("code_language", e.target.value)} />
              <Textarea label="Source Code" value={form.source_code} onChange={(e) => set("source_code", e.target.value)} rows={10} className="font-mono text-xs" />
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-[#CDBBAD]/50 p-5 space-y-4">
              <h2 className="font-semibold text-[#11100E]">Details</h2>
              <Select label="Category" options={categoryOptions} value={form.category_id} onChange={(e) => set("category_id", e.target.value)} />
              <Select label="Difficulty" options={difficultyOptions} value={form.difficulty} onChange={(e) => set("difficulty", e.target.value)} />
              <Input label="Estimated Time" value={form.estimated_time} onChange={(e) => set("estimated_time", e.target.value)} />
            </div>

            <div className="bg-white rounded-xl border border-[#CDBBAD]/50 p-5 space-y-3">
              <h2 className="font-semibold text-[#11100E]">Visibility</h2>
              {[{ key: "published", label: "Published" }, { key: "featured", label: "Featured" }].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form[key as keyof typeof form] as boolean} onChange={(e) => set(key, e.target.checked)} className="accent-[#5D1C34]" />
                  <span className="text-sm text-[#11100E]">{label}</span>
                </label>
              ))}
            </div>

            {saveError && (
              <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{saveError}</p>
            )}

            <div className="flex gap-3">
              <Link href="/admin/tutorials" className="flex-1 text-center border border-[#CDBBAD] text-[#899581] py-2.5 rounded-xl text-sm font-medium hover:bg-[#F0E9E3] transition-colors">
                Cancel
              </Link>
              <button type="submit" disabled={saving} className="flex-1 bg-[#5D1C34] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-[#4a1628] disabled:opacity-60 transition-colors">
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>

            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="w-full flex items-center justify-center gap-2 border border-red-200 text-red-600 py-2.5 rounded-xl text-sm font-medium hover:bg-red-50 disabled:opacity-60 transition-colors"
            >
              <Trash2 size={14} /> {deleting ? "Deleting…" : "Delete Tutorial"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
