"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, Trash2, AlertCircle, Star, Package, Tag, Box } from "lucide-react";
import { productsApi } from "@/lib/api";
import { getAdminToken } from "@/lib/adminAuth";
import { formatPrice } from "@/lib/utils";

export default function AdminProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    // Fetch by id (UUID passed from the products list)
    productsApi.getById(productId)
      .then((p) => { setProduct(p); setSelectedImage(0); })
      .catch((err) => setError(err.message ?? "Failed to load product."))
      .finally(() => setLoading(false));
  }, [productId]);

  const handleDelete = async () => {
    if (!confirm(`Delete "${product?.name}"? This cannot be undone.`)) return;
    const token = getAdminToken();
    if (!token) { setError("Not authenticated."); return; }
    setDeleting(true);
    try {
      await productsApi.delete(product.id, token);
      router.push("/admin/products");
    } catch (err: any) {
      setError(err.message ?? "Failed to delete.");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-[#899581] text-sm">
        Loading product…
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="text-center py-20">
        <p className="text-red-500 mb-3">{error || "Product not found."}</p>
        <Link href="/admin/products" className="text-[#5D1C34] text-sm hover:underline">
          ← Back to Products
        </Link>
      </div>
    );
  }

  const images: string[] = product.images ?? [];
  const discount = product.original_price && product.original_price > product.price
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : 0;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Link
          href="/admin/products"
          className="p-2 rounded-lg text-[#899581] hover:bg-white transition-colors"
          aria-label="Back"
        >
          <ArrowLeft size={16} />
        </Link>
        <h1 className="text-xl font-bold text-[#11100E] flex-1 min-w-0 truncate">{product.name}</h1>
        <div className="flex items-center gap-2 ml-auto">
          <Link
            href={`/admin/products/${product.id}/edit`}
            className="flex items-center gap-1.5 border border-[#CDBBAD] text-[#11100E] px-3 py-2 rounded-lg text-sm font-medium hover:bg-[#F0E9E3] transition-colors"
          >
            <Pencil size={13} /> Edit
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1.5 border border-red-200 text-red-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            <Trash2 size={13} /> {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          <AlertCircle size={14} className="flex-shrink-0" /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — images + description */}
        <div className="lg:col-span-2 space-y-5">

          {/* Image gallery */}
          <div className="bg-white rounded-xl border border-[#CDBBAD]/50 p-4">
            {images.length > 0 ? (
              <div className="space-y-3">
                {/* Main image */}
                <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-[#F0E9E3]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={images[selectedImage]}
                    alt={product.name}
                    className="w-full h-full object-contain"
                  />
                  {discount > 0 && (
                    <span className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-md">
                      -{discount}%
                    </span>
                  )}
                </div>
                {/* Thumbnails */}
                {images.length > 1 && (
                  <div className="flex gap-2 flex-wrap">
                    {images.map((src, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedImage(idx)}
                        className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors flex-shrink-0 ${
                          idx === selectedImage
                            ? "border-[#5D1C34]"
                            : "border-[#CDBBAD]/40 hover:border-[#CDBBAD]"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt={`Image ${idx + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full aspect-video rounded-lg bg-[#F0E9E3] flex items-center justify-center text-[#CDBBAD]">
                <Package size={48} strokeWidth={1} />
              </div>
            )}
          </div>

          {/* Description */}
          <div className="bg-white rounded-xl border border-[#CDBBAD]/50 p-5 space-y-3">
            <h2 className="font-semibold text-[#11100E]">Description</h2>
            {product.short_description && (
              <p className="text-sm text-[#899581] border-l-2 border-[#CDBBAD] pl-3">
                {product.short_description}
              </p>
            )}
            {product.description ? (
              <p className="text-sm text-[#11100E] whitespace-pre-wrap leading-relaxed">
                {product.description}
              </p>
            ) : (
              <p className="text-sm text-[#CDBBAD] italic">No description.</p>
            )}
          </div>

          {/* Specifications */}
          {Array.isArray(product.specs) && product.specs.length > 0 && (
            <div className="bg-white rounded-xl border border-[#CDBBAD]/50 p-5">
              <h2 className="font-semibold text-[#11100E] mb-3">Specifications</h2>
              <div className="divide-y divide-[#F0E9E3]">
                {product.specs.map((spec: any, idx: number) => (
                  <div key={idx} className="flex py-2 gap-4">
                    <span className="text-xs font-medium text-[#899581] w-40 flex-shrink-0">{spec.label}</span>
                    <span className="text-xs text-[#11100E]">{spec.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reviews */}
          {Array.isArray(product.reviews) && product.reviews.length > 0 && (
            <div className="bg-white rounded-xl border border-[#CDBBAD]/50 p-5">
              <h2 className="font-semibold text-[#11100E] mb-3">
                Reviews ({product.review_count ?? product.reviews.length})
              </h2>
              <div className="space-y-4">
                {product.reviews.map((r: any) => (
                  <div key={r.id} className="border-b border-[#F0E9E3] pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-[#11100E]">{r.user_name}</span>
                      <span className="text-xs text-[#899581]">
                        {new Date(r.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex gap-0.5 mb-1">
                      {[1,2,3,4,5].map((s) => (
                        <Star key={s} size={12} className={s <= r.rating ? "fill-amber-400 text-amber-400" : "text-[#CDBBAD]"} />
                      ))}
                    </div>
                    {r.title && <p className="text-sm font-medium text-[#11100E]">{r.title}</p>}
                    {r.body && <p className="text-sm text-[#899581] mt-0.5">{r.body}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar — meta */}
        <div className="space-y-4">

          {/* Pricing */}
          <div className="bg-white rounded-xl border border-[#CDBBAD]/50 p-5 space-y-3">
            <h2 className="font-semibold text-[#11100E]">Pricing & Inventory</h2>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#11100E]">{formatPrice(product.price)}</span>
              {product.original_price && (
                <span className="text-sm text-[#899581] line-through">{formatPrice(product.original_price)}</span>
              )}
              {discount > 0 && (
                <span className="text-xs font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">-{discount}%</span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="bg-[#F0E9E3] rounded-lg p-3 text-center">
                <p className="text-xs text-[#899581] mb-0.5">Stock</p>
                <p className={`text-lg font-bold ${product.stock > 10 ? "text-green-600" : product.stock > 0 ? "text-amber-600" : "text-red-500"}`}>
                  {product.stock}
                </p>
              </div>
              <div className="bg-[#F0E9E3] rounded-lg p-3 text-center">
                <p className="text-xs text-[#899581] mb-0.5">Rating</p>
                <p className="text-lg font-bold text-[#11100E]">
                  {product.rating?.toFixed(1) ?? "—"}
                  <span className="text-xs text-amber-400 ml-0.5">★</span>
                </p>
              </div>
            </div>
            <div className={`text-xs font-medium px-2 py-1 rounded-md w-fit ${product.in_stock ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
              {product.in_stock ? "In Stock" : "Out of Stock"}
            </div>
          </div>

          {/* Meta */}
          <div className="bg-white rounded-xl border border-[#CDBBAD]/50 p-5 space-y-3">
            <h2 className="font-semibold text-[#11100E]">Details</h2>
            <div className="space-y-2 text-sm">
              <div className="flex gap-2">
                <span className="text-[#899581] w-20 flex-shrink-0">SKU</span>
                <span className="font-mono text-[#11100E]">{product.sku}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-[#899581] w-20 flex-shrink-0">Slug</span>
                <span className="font-mono text-xs text-[#899581] break-all">{product.slug}</span>
              </div>
              {product.category && (
                <div className="flex items-center gap-2">
                  <span className="text-[#899581] w-20 flex-shrink-0">Category</span>
                  <span className="flex items-center gap-1 text-[#11100E]">
                    <Tag size={12} className="text-[#5D1C34]" />
                    {product.category.name}
                  </span>
                </div>
              )}
              {product.brand && (
                <div className="flex items-center gap-2">
                  <span className="text-[#899581] w-20 flex-shrink-0">Brand</span>
                  <span className="flex items-center gap-1 text-[#11100E]">
                    <Box size={12} className="text-[#5D1C34]" />
                    {product.brand.name}
                  </span>
                </div>
              )}
              <div className="flex gap-2">
                <span className="text-[#899581] w-20 flex-shrink-0">Reviews</span>
                <span className="text-[#11100E]">{product.review_count ?? 0}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-[#899581] w-20 flex-shrink-0">Created</span>
                <span className="text-[#11100E]">{new Date(product.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Flags */}
          <div className="bg-white rounded-xl border border-[#CDBBAD]/50 p-5 space-y-2">
            <h2 className="font-semibold text-[#11100E]">Flags</h2>
            {[
              { key: "featured",    label: "Featured" },
              { key: "new_arrival", label: "New Arrival" },
              { key: "best_seller", label: "Best Seller" },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-sm text-[#899581]">{label}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${product[key] ? "bg-green-50 text-green-700" : "bg-[#F0E9E3] text-[#CDBBAD]"}`}>
                  {product[key] ? "Yes" : "No"}
                </span>
              </div>
            ))}
          </div>

          {/* Tags */}
          {Array.isArray(product.tags) && product.tags.length > 0 && (
            <div className="bg-white rounded-xl border border-[#CDBBAD]/50 p-5">
              <h2 className="font-semibold text-[#11100E] mb-3">Tags</h2>
              <div className="flex flex-wrap gap-1.5">
                {product.tags.map((tag: string) => (
                  <span key={tag} className="text-xs bg-[#F0E9E3] text-[#899581] px-2 py-1 rounded-md">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
