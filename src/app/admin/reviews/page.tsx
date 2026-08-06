"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Star, Trash2, CheckCircle, XCircle } from "lucide-react";
import { reviewsApi } from "@/lib/api";
import { getAdminSession } from "@/lib/adminAuth";
import { formatDateShort } from "@/lib/utils";

type Filter = "all" | "approved" | "pending";

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={11}
          className={i < rating ? "fill-[#A67D45] text-[#A67D45]" : "text-[#CDBBAD]"}
        />
      ))}
    </div>
  );
}

export default function AdminReviewsPage() {
  const [reviews, setReviews]   = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [filter, setFilter]     = useState<Filter>("all");
  const [search, setSearch]     = useState("");

  const load = useCallback(() => {
    const token = getAdminSession()?.id ?? null;
    if (!token) { setError("Not authenticated."); setLoading(false); return; }
    setLoading(true);
    reviewsApi
      .list(token)
      .then(setReviews)
      .catch((e) => setError(e.message ?? "Failed to load reviews."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = reviews.filter((r) => {
    const matchFilter =
      filter === "all" ||
      (filter === "approved" && r.verified) ||
      (filter === "pending"  && !r.verified);
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      r.user_name.toLowerCase().includes(q) ||
      r.product_name.toLowerCase().includes(q) ||
      r.title.toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  const handleVerify = async (id: string) => {
    const token = getAdminSession()?.id ?? null;
    if (!token) return;
    try {
      const updated = await reviewsApi.verify(id, token);
      setReviews((prev) => prev.map((r) => r.id === id ? { ...r, verified: updated.verified } : r));
    } catch (e: any) {
      alert(e.message ?? "Failed to update review.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this review? This cannot be undone.")) return;
    const token = getAdminSession()?.id ?? null;
    if (!token) return;
    try {
      await reviewsApi.delete(id, token);
      setReviews((prev) => prev.filter((r) => r.id !== id));
    } catch (e: any) {
      alert(e.message ?? "Failed to delete review.");
    }
  };

  const pendingCount  = reviews.filter((r) => !r.verified).length;
  const approvedCount = reviews.filter((r) =>  r.verified).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#11100E]">Reviews</h1>
          <p className="text-xs text-[#899581] mt-0.5">
            {reviews.length} total · {pendingCount} pending · {approvedCount} approved
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-[#CDBBAD]/50 p-4 flex flex-wrap gap-3 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by customer, product, or title…"
          className="flex-1 min-w-0 border border-[#CDBBAD] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5D1C34]/30"
        />
        <div className="flex gap-2">
          {(["all", "approved", "pending"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-lg text-xs font-medium capitalize border transition-colors ${
                filter === f
                  ? "bg-[#5D1C34] text-white border-[#5D1C34]"
                  : "border-[#CDBBAD] text-[#899581] hover:border-[#5D1C34]"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="text-center py-16 text-[#899581] text-sm">Loading reviews…</div>
      )}

      {error && (
        <div className="text-center py-8 text-red-500 text-sm bg-red-50 rounded-xl border border-red-200">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="bg-white rounded-xl border border-[#CDBBAD]/50 overflow-hidden">
          <div className="px-4 py-3 border-b border-[#F0E9E3] text-xs text-[#899581]">
            {filtered.length} review{filtered.length !== 1 ? "s" : ""}
          </div>
          <div className="divide-y divide-[#F0E9E3]">
            {filtered.map((review) => (
              <div key={review.id} className="px-4 py-4 flex gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-semibold text-sm text-[#11100E]">
                      {review.user_name}
                    </span>
                    <StarRow rating={review.rating} />
                    <span className="text-xs text-[#899581]">
                      {formatDateShort(review.created_at)}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        review.verified
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {review.verified ? "Approved" : "Pending"}
                    </span>
                  </div>
                  {review.product_name && (
                    <Link
                      href={`/products/${review.product_slug}`}
                      target="_blank"
                      className="text-xs font-medium text-[#5D1C34] hover:underline mb-1 inline-block"
                    >
                      on: {review.product_name}
                    </Link>
                  )}
                  <p className="text-sm font-medium text-[#11100E]">{review.title}</p>
                  {review.body && (
                    <p className="text-xs text-[#899581] mt-0.5 line-clamp-2">{review.body}</p>
                  )}
                </div>

                <div className="flex flex-col gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleVerify(review.id)}
                    title={review.verified ? "Unapprove" : "Approve"}
                    className={`p-1.5 rounded-lg transition-colors ${
                      review.verified
                        ? "bg-green-100 text-green-600 hover:bg-green-200"
                        : "bg-[#F0E9E3] text-[#899581] hover:bg-green-100 hover:text-green-600"
                    }`}
                  >
                    {review.verified ? <CheckCircle size={15} /> : <XCircle size={15} />}
                  </button>
                  <button
                    onClick={() => handleDelete(review.id)}
                    title="Delete"
                    className="p-1.5 rounded-lg bg-[#F0E9E3] text-[#899581] hover:bg-red-100 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-[#899581] text-sm">
              No reviews found.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
