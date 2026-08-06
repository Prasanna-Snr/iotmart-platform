"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Select from "@/components/ui/Select";
import { tutorialsApi } from "@/lib/api";
import { getAdminSession } from "@/lib/adminAuth";
import { slugify } from "@/lib/utils";

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

export default function AdminAddTutorialPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<any[]>([]);
  const [form, setForm] = useState({
    title: "", slug: "", short_description: "", description: "",
    difficulty: "Beginner", category_id: "", estimated_time: "",
    author: "", components: "", tags: "", source_code: "",
    code_language: "cpp", cover_image: "", featured: false, published: false,
  });
  const [errors, setErrors]     = useState<Record<string, string>>({});
  const [saving, setSaving]     = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    tutorialsApi.categories().then(setCategories).catch(() => {});
  }, []);

  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }));

  const set = (k: string, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    setForm((f) => ({ ...f, title, slug: slugify(title) }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.title.trim())          e.title          = "Required";
    if (!form.difficulty)            e.difficulty     = "Required";
    if (!form.category_id)           e.category_id    = "Required";
    if (!form.estimated_time.trim()) e.estimated_time = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const token = getAdminSession()?.id ?? null;
    if (!token) { setSaveError("Not authenticated."); return; }
    setSaving(true);
    setSaveError("");
    try {
      await tutorialsApi.create({
        title:             form.title.trim(),
        slug:              form.slug.trim() || slugify(form.title),
        short_description: form.short_description.trim(),
        description:       form.description.trim(),
        difficulty:        form.difficulty,
        category_id:       form.category_id,
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
      router.push("/admin/tutorials");
    } catch (err: any) {
      setSaveError(err.message ?? "Failed to save tutorial.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/tutorials" className="p-2 rounded-lg text-[#899581] hover:bg-white transition-colors" aria-label="Back">
          <ArrowLeft size={16} />
        </Link>
        <h1 className="text-xl font-bold text-[#11100E]">Add New Tutorial</h1>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl border border-[#CDBBAD]/50 p-5 space-y-4">
              <h2 className="font-semibold text-[#11100E]">Basic Information</h2>
              <Input label="Title" value={form.title} onChange={handleTitleChange} error={errors.title} required />
              <Input label="Slug" value={form.slug} onChange={(e) => set("slug", e.target.value)} />
              <Input label="Short Description" value={form.short_description} onChange={(e) => set("short_description", e.target.value)} />
              <Textarea label="Full Description" value={form.description} onChange={(e) => set("description", e.target.value)} rows={4} />
              <Input label="Author" value={form.author} onChange={(e) => set("author", e.target.value)} placeholder="e.g. IoTMart Team" />
              <Input label="Tags (comma-separated)" value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="esp32, sensor, wifi" />
              <Input label="Components (comma-separated)" value={form.components} onChange={(e) => set("components", e.target.value)} placeholder="ESP32, DHT22, OLED" />
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
              <Select label="Category" options={categoryOptions} placeholder="Select category" value={form.category_id} onChange={(e) => set("category_id", e.target.value)} error={errors.category_id} />
              <Select label="Difficulty" options={difficultyOptions} value={form.difficulty} onChange={(e) => set("difficulty", e.target.value)} error={errors.difficulty} />
              <Input label="Estimated Time" value={form.estimated_time} onChange={(e) => set("estimated_time", e.target.value)} placeholder="e.g. 2–3 hours" error={errors.estimated_time} required />
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
                {saving ? "Saving…" : "Save Tutorial"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
