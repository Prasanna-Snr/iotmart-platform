"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle, Trash2, AlertCircle, Plus } from "lucide-react";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Select from "@/components/ui/Select";
import ImagePicker from "@/components/admin/ImagePicker";
import { productsApi, categoriesApi, brandsApi } from "@/lib/api";
import { getAdminToken } from "@/lib/adminAuth";
import { slugify } from "@/lib/utils";

interface Spec { label: string; value: string }

export default function AdminEditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const [categories, setCategories] = useState<{ value: string; label: string }[]>([]);
  const [brands, setBrands] = useState<{ value: string; label: string }[]>([]);
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
    category: "",   // slug
    brand: "",      // slug
    tags: "",
    stock: "",
    featured: false,
    newArrival: false,
    bestSeller: false,
  });
  const [specs, setSpecs] = useState<Spec[]>([{ label: "", value: "" }]);
  const [images, setImages] = useState<string[]>([]);
  const [productName, setProductName] = useState("");

  const [loadError, setLoadError] = useState("");
  const [apiError, setApiError] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [deleted, setDeleted] = useState(false);

  // Fetch categories, brands, and product data
  useEffect(() => {
    const token = getAdminToken();

    Promise.all([
      categoriesApi.list(),
      brandsApi.list(),
      productsApi.getById(productId),
    ])
      .then(([cats, brs, product]: [any[], any[], any]) => {
        const catMap: Record<string, string> = {};
        const brandMapLocal: Record<string, string> = {};

        const catOptions = (cats as any[]).map((c) => {
          catMap[c.slug] = c.id;
          return { value: c.slug, label: c.name };
        });
        const brandOptions = (brs as any[]).map((b) => {
          brandMapLocal[b.slug] = b.id;
          return { value: b.slug, label: b.name };
        });

        setCategories(catOptions);
        setBrands(brandOptions);
        setCategoryMap(catMap);
        setBrandMap(brandMapLocal);

        // Populate form from product
        setProductName(product.name);
        setForm({
          name: product.name ?? "",
          slug: product.slug ?? "",
          sku: product.sku ?? "",
          shortDescription: product.short_description ?? "",
          description: product.description ?? "",
          price: String(product.price ?? ""),
          originalPrice: product.original_price ? String(product.original_price) : "",
          category: product.category?.slug ?? "",
          brand: product.brand?.slug ?? "",
          tags: (product.tags ?? []).join(", "),
          stock: String(product.stock ?? ""),
          featured: product.featured ?? false,
          newArrival: product.new_arrival ?? false,
          bestSeller: product.best_seller ?? false,
        });

        if (Array.isArray(product.specs) && product.specs.length > 0) {
          setSpecs(
            product.specs.map((s: any) => ({
              label: s.label ?? "",
              value: s.value ?? "",
            }))
          );
        }

        if (Array.isArray(product.images) && product.images.length > 0) {
          setImages(product.images);
        }
      })
      .catch((err) => {
        setLoadError(err.message ?? "Failed to load product.");
      })
      .finally(() => setPageLoading(false));
  }, [productId]);

  const setField = (key: string, val: string | boolean) =>
    setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getAdminToken();
    if (!token) {
      setApiError("Not authenticated. Please log in as admin.");
      return;
    }

    setLoading(true);
    setApiError("");

    try {
      const payload: Record<string, any> = {
        name: form.name.trim(),
        short_description: form.shortDescription.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        original_price: form.originalPrice ? Number(form.originalPrice) : null,
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

      if (form.category && categoryMap[form.category]) {
        payload.category_id = categoryMap[form.category];
      }
      if (form.brand && brandMap[form.brand]) {
        payload.brand_id = brandMap[form.brand];
      }

      await productsApi.update(productId, payload, token);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setApiError(err.message ?? "Failed to update product.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${productName || "this product"}"? This cannot be undone.`)) return;

    const token = getAdminToken();
    if (!token) {
      setApiError("Not authenticated. Please log in as admin.");
      return;
    }

    setLoading(true);
    setApiError("");
    try {
      await productsApi.delete(productId, token);
      setDeleted(true);
    } catch (err: any) {
      setApiError(err.message ?? "Failed to delete product.");
    } finally {
      setLoading(false);
    }
  };

  const addSpec = () => setSpecs((s) => [...s, { label: "", value: "" }]);
  const removeSpec = (idx: number) => setSpecs((s) => s.filter((_, i) => i !== idx));
  const updateSpec = (idx: number, key: keyof Spec, val: string) =>
    setSpecs((s) => s.map((sp, i) => (i === idx ? { ...sp, [key]: val } : sp)));

  if (deleted) {
    return (
      <div className="text-center py-20">
        <p className="text-green-600 font-medium mb-3">Product deleted successfully.</p>
        <Link href="/admin/products" className="text-[#5D1C34] text-sm hover:underline">
          ← Back to Products
        </Link>
      </div>
    );
  }

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-[#899581] text-sm">
        Loading product…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="text-center py-20">
        <p className="text-red-500 mb-3">{loadError}</p>
        <Link href="/admin/products" className="text-[#5D1C34] text-sm hover:underline">
          ← Back to Products
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/admin/products"
          className="p-2 rounded-lg text-[#899581] hover:bg-white transition-colors"
          aria-label="Back"
        >
          <ArrowLeft size={16} />
        </Link>
        <h1 className="text-xl font-bold text-[#11100E]">Edit Product</h1>
        {productName && (
          <span className="text-sm text-[#899581]">— {productName}</span>
        )}
        {saved && (
          <span className="ml-auto flex items-center gap-1.5 text-green-600 text-sm font-medium">
            <CheckCircle size={15} />
            Changes saved
          </span>
        )}
      </div>

      {apiError && (
        <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          <AlertCircle size={15} className="flex-shrink-0" />
          {apiError}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main info */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl border border-[#CDBBAD]/50 p-5 space-y-4">
              <h2 className="font-semibold text-[#11100E]">Basic Information</h2>
              <Input
                label="Product Name"
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Slug"
                  value={form.slug}
                  onChange={(e) => setField("slug", e.target.value)}
                  hint="Read-only after creation"
                  readOnly
                />
                <Input
                  label="SKU"
                  value={form.sku}
                  onChange={(e) => setField("sku", e.target.value)}
                  readOnly
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
                label="Price ($)"
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) => setField("price", e.target.value)}
              />
              <Input
                label="Original Price ($)"
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
              />
            </div>

            <div className="bg-white rounded-xl border border-[#CDBBAD]/50 p-5 space-y-4">
              <h2 className="font-semibold text-[#11100E]">Organization</h2>
              <Select
                label="Category"
                options={categories}
                value={form.category}
                onChange={(e) => setField("category", e.target.value)}
                placeholder="Select category"
              />
              <Select
                label="Brand"
                options={brands}
                value={form.brand}
                onChange={(e) => setField("brand", e.target.value)}
                placeholder="Select brand"
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
                disabled={loading}
                className="flex-1 bg-[#5D1C34] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-[#4a1628] disabled:opacity-60 transition-colors"
              >
                {loading ? "Saving…" : "Save Changes"}
              </button>
            </div>

            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 border border-red-200 text-red-600 py-2.5 rounded-xl text-sm font-medium hover:bg-red-50 disabled:opacity-60 transition-colors"
            >
              <Trash2 size={14} /> Delete Product
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
