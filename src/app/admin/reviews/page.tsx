"use client";

import { useState } from "react";
import { Star, Trash2, CheckCircle, XCircle } from "lucide-react";
import { products } from "@/data/products";
import type { ProductReview } from "@/types";

interface ReviewWithProduct extends ProductReview {
  productName: string;
  productId: string;
}

// Flatten all reviews from all products
const allReviews: ReviewWithProduct[] = products.flatMap((p) =>
  p.reviews.map((r) => ({ ...r, productName: p.name, productId: p.id }))
);

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<ReviewWithProduct[]>(allReviews);
  const [approved, setApproved] = useState<Set<string>>(new Set(allReviews.filter((r) => r.verified).map((r) => r.id)));
  const [filter, setFilter] = useState<"all" | "approved" | "pending">("all");
  const [search, setSearch] = useState("");

  const filtered = reviews.filter((r) => {
    const matchFilter = filter === "all" || (filter === "approved" && approved.has(r.id)) || (filter === "pending" && !approved.has(r.id));
    const matchSearch = !search || r.userName.toLowerCase().includes(search.toLowerCase()) || r.productName.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const toggleApprove = (id: string) => {
    setApproved((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const deleteReview = (id: string) => {
    if (confirm("Delete this review?")) {
      setReviews((prev) => prev.filter((r) => r.id !== id));
    }
  };

  const StarRow = ({ rating }: { rating: number }) => (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={11} className={i < rating ? "fill-[#A67D45] text-[#A67D45]" : "text-[#CDBBAD]"} />
      ))}
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-[#11100E]">Reviews</h1>
        <span className="text-sm text-[#899581]">{reviews.length} total</span>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-[#CDBBAD]/50 p-4 flex flex-wrap gap-3 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by customer or product…"
          className="flex-1 min-w-0 border border-[#CDBBAD] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5D1C34]"
        />
        <div className="flex gap-2">
          {(["all", "approved", "pending"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-2 rounded-lg text-xs font-medium capitalize border transition-colors ${filter === f ? "bg-[#5D1C34] text-white border-[#5D1C34]" : "border-[#CDBBAD] text-[#899581] hover:border-[#5D1C34]"}`}>{f}</button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#CDBBAD]/50 overflow-hidden">
        <div className="px-4 py-3 border-b border-[#F0E9E3] text-xs text-[#899581]">{filtered.length} review{filtered.length !== 1 ? "s" : ""}</div>
        <div className="divide-y divide-[#F0E9E3]">
          {filtered.map((review) => {
            const isApproved = approved.has(review.id);
            return (
              <div key={review.id} className="px-4 py-4 flex gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-semibold text-sm text-[#11100E]">{review.userName}</span>
                    <StarRow rating={review.rating} />
                    <span className="text-xs text-[#899581]">{review.date}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isApproved ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                      {isApproved ? "Approved" : "Pending"}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-[#5D1C34] mb-1">on: {review.productName}</p>
                  <p className="text-sm font-medium text-[#11100E]">{review.title}</p>
                  <p className="text-xs text-[#899581] mt-0.5 line-clamp-2">{review.body}</p>
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <button
                    onClick={() => toggleApprove(review.id)}
                    title={isApproved ? "Unapprove" : "Approve"}
                    className={`p-1.5 rounded-lg transition-colors ${isApproved ? "bg-green-100 text-green-600 hover:bg-green-200" : "bg-[#F0E9E3] text-[#899581] hover:bg-green-100 hover:text-green-600"}`}
                  >
                    {isApproved ? <CheckCircle size={15} /> : <XCircle size={15} />}
                  </button>
                  <button onClick={() => deleteReview(review.id)} title="Delete" className="p-1.5 rounded-lg bg-[#F0E9E3] text-[#899581] hover:bg-red-100 hover:text-red-600 transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        {filtered.length === 0 && <div className="text-center py-12 text-[#899581] text-sm">No reviews found.</div>}
      </div>
    </div>
  );
}
