"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Select from "@/components/ui/Select";
import ImagePicker from "@/components/admin/ImagePicker";
import {
  productsApi,
  categoriesApi,
  brandsApi,
  type Category,
  type Brand,
  type ProductCreateInput,
} from "@/lib/api";
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

interface Spec { label: string; value: string }

export default function AdminAddProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<{ value: string; label: string }[]>([]);
  const [brands, setBrands] = useState<{ value: string; label: string }[]>([]);
  // Map slug -> id for category/brand
  const [categoryMap, setCategoryMap] = useState<Record<string, string>>({});
  const [brandMap, setBrandMap] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    name: "",
    slug: "",
    sku: "",
    shortDescription: "",
    description: "",
    price: "",
    originalPrice: "",
    category: "",
    brand: "",
    tags: "",
    stock: "",
    featured: false,
    newArrival: false,
    bestSeller: false,
  });
  const [specs, setSpecs] = useState<Spec[]>([{ label: "", value: "" }]);
  const [images, setImages] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);

  // Load categories and brands from API on mount
  useEffect(() => {
    Promise.all([categoriesApi.list(), brandsApi.list()]).then(([cats, brs]) => {
      const catMap: Record<string, string> = {};
      const brandMapLocal: Record<string, string> = {};
      setCategories(
        cats.map((c: Category) => {
          catMap[c.slug] = c.id;
          return { value: c.slug, label: c.name };
        })
      );
      setBrands(
        brs.map((b: Brand) => {
          brandMapLocal[b.slug] = b.id;
          return { value: b.slug, label: b.name };
        })
      );
      setCategoryMap(catMap);
      setBrandMap(brandMapLocal);
    }).catch(() => {
      // Non-fatal: form still usable, dropdowns just stay empty
    });
  }, []);

  const setField = (key: string, val: string | boolean) =>
    setForm((f) => ({ ...f, [key]: val }));

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setForm((f) => ({ ...f, name, slug: slugify(name) }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Required";
    if (!form.sku.trim()) e.sku = "Required";
    if (!form.price || isNaN(Number(form.price))) e.price = "Valid price required";
    if (!form.category) e.category = "Required";
    if (!form.stock || isNaN(Number(form.stock))) e.stock = "Valid number required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const token = getAdminSession()?.id ?? null;
    if (!token) {
      setApiError("Not authenticated. Please log in as admin.");
      return;
    }

    setLoading(true);
    setApiError("");

    try {
      const payload: ProductCreateInput = {
        name: form.name.trim(),
        slug: form.slug.trim() || slugify(form.name),
        sku: form.sku.trim(),
        short_description: form.shortDescription.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        original_price: form.originalPrice ? Number(form.originalPrice) : null,
        category_id: categoryMap[form.category],
        ...(form.brand && brandMap[form.brand] ? { brand_id: brandMap[form.brand] } : {}),
        images,
        tags: form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        specs: specs
          .filter((s) => s.label.trim() && s.value.trim())
          .map((s) => ({ label: s.label.trim(), value: s.value.trim() })),
        stock: Number(form.stock),
        featured: form.featured,
        new_arrival: form.newArrival,
        best_seller: form.bestSeller,
        in_stock: Number(form.stock) > 0,
      };

      await productsApi.create(payload, token);
      setSaved(true);
      setTimeout(() => {
        router.push("/admin/products");
      }, 1200);
    } catch (err) {
      setApiError(errMsg(err, "Failed to create product."));
    } finally {
      setLoading(false);
    }
  };

  const addSpec = () => setSpecs((s) => [...s, { label: "", value: "" }]);

  const removeSpec = (idx: number) =>
    setSpecs((s) => s.filter((_, i) => i !== idx));

  const updateSpec = (idx: number, key: keyof Spec, val: string) =>
    setSpecs((s) => s.map((sp, i) => (i === idx ? { ...sp, [key]: val } : sp)));

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/admin/products"
          className="p-2 rounded-lg text-[#899581] hover:bg-white hover:text-[#11100E] transition-colors"
          aria-label="Back"
        >
          <ArrowLeft size={16} />
        </Link>
        <h1 className="text-xl font-bold text-[#11100E]">Add New Product</h1>
        {saved && (
          <span className="ml-auto flex items-center gap-1.5 text-green-600 text-sm font-medium">
            <CheckCircle size={15} />
            Saved — redirecting…
          </span>
        )}
      </div>

      {apiError && (
        <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          <AlertCircle size={15} className="flex-shrink-0" />
          {apiError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main info */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl border border-[#CDBBAD]/50 p-5 space-y-4">
              <h2 className="font-semibold text-[#11100E]">Basic Information</h2>
              <Input
                label="Product Name"
                value={form.name}
                onChange={handleNameChange}
                error={errors.name}
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Slug (auto-generated)"
                  value={form.slug}
                  onChange={(e) => setField("slug", e.target.value)}
                />
                <Input
                  label="SKU"
                  value={form.sku}
                  onChange={(e) => setField("sku", e.target.value)}
                  error={errors.sku}
                  required
                />
              </div>
              <Input
                label="Short Description"
                value={form.shortDescription}
                onChange={(e) => setField("shortDescription", e.target.value)}
              />
              <Textarea
                label="Full Description"
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                rows={4}
              />
              <Input
                label="Tags (comma-separated)"
                placeholder="arduino, sensor, temperature"
                value={form.tags}
                onChange={(e) => setField("tags", e.target.value)}
              />
            </div>

            {/* Images */}
            <div className="bg-white rounded-xl border border-[#CDBBAD]/50 p-5">
              <h2 className="font-semibold text-[#11100E] mb-4">Images</h2>
              <ImagePicker images={images} onChange={setImages} />
            </div>

            {/* Specifications */}
            <div className="bg-white rounded-xl border border-[#CDBBAD]/50 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-[#11100E]">Specifications</h2>
                <button
                  type="button"
                  onClick={addSpec}
                  className="flex items-center gap-1 text-sm text-[#5D1C34] hover:underline"
                >
                  <Plus size={13} />
                  Add Row
                </button>
              </div>
              <div className="space-y-3">
                {specs.map((spec, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      placeholder="Label"
                      value={spec.label}
                      onChange={(e) => updateSpec(idx, "label", e.target.value)}
                    />
                    <Input
                      placeholder="Value"
                      value={spec.value}
                      onChange={(e) => updateSpec(idx, "value", e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => removeSpec(idx)}
                      disabled={specs.length === 1}
                      className="text-[#899581] hover:text-red-500 disabled:opacity-30 transition-colors flex-shrink-0 mt-1"
                      aria-label="Remove spec row"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-[#CDBBAD]/50 p-5 space-y-4">
              <h2 className="font-semibold text-[#11100E]">Pricing & Inventory</h2>
              <Input
                label="Price (Rs.)"
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) => setField("price", e.target.value)}
                error={errors.price}
                required
              />
              <Input
                label="Original Price (Rs.)"
                type="number"
                min="0"
                step="0.01"
                value={form.originalPrice}
                onChange={(e) => setField("originalPrice", e.target.value)}
                hint="Leave blank if no discount"
              />
              <Input
                label="Stock Quantity"
                type="number"
                min="0"
                value={form.stock}
                onChange={(e) => setField("stock", e.target.value)}
                error={errors.stock}
                required
              />
            </div>

            <div className="bg-white rounded-xl border border-[#CDBBAD]/50 p-5 space-y-4">
              <h2 className="font-semibold text-[#11100E]">Organization</h2>
              <Select
                label="Category"
                options={categories}
                placeholder="Select category"
                value={form.category}
                onChange={(e) => setField("category", e.target.value)}
                error={errors.category}
              />
              <Select
                label="Brand"
                options={brands}
                placeholder="Select brand (optional)"
                value={form.brand}
                onChange={(e) => setField("brand", e.target.value)}
              />
            </div>

            <div className="bg-white rounded-xl border border-[#CDBBAD]/50 p-5 space-y-3">
              <h2 className="font-semibold text-[#11100E]">Flags</h2>
              {[
                { key: "featured", label: "Featured Product" },
                { key: "newArrival", label: "New Arrival" },
                { key: "bestSeller", label: "Best Seller" },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form[key as keyof typeof form] as boolean}
                    onChange={(e) => setField(key, e.target.checked)}
                    className="accent-[#5D1C34]"
                  />
                  <span className="text-sm text-[#11100E]">{label}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-3">
              <Link
                href="/admin/products"
                className="flex-1 text-center border border-[#CDBBAD] text-[#899581] py-2.5 rounded-xl text-sm font-medium hover:bg-[#F0E9E3] transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading || saved}
                className="flex-1 bg-[#5D1C34] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-[#4a1628] disabled:opacity-60 transition-colors"
              >
                {loading ? "Saving…" : "Save Product"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
