"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Star, CheckCircle, AlertCircle, LogIn } from "lucide-react";
import { productsApi } from "@/lib/api";
import { getCustomerToken } from "@/lib/customerAuth";

interface Props {
  productId: string;
  onSubmitted?: () => void;
}

export default function WriteReviewForm({ productId, onSubmitted }: Props) {
  const router = useRouter();
  const [rating, setRating]   = useState(0);
  const [hovered, setHovered] = useState(0);
  const [title, setTitle]     = useState("");
  const [body, setBody]       = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError]     = useState("");
  const [errors, setErrors]   = useState<{ rating?: string; title?: string }>({});

  const token = getCustomerToken();

  const validate = () => {
    const e: typeof errors = {};
    if (!rating) e.rating = "Please select a star rating.";
    if (!title.trim()) e.title = "Title is required.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setError("");
    try {
      await productsApi.addReview(
        productId,
        { rating, title: title.trim(), body: body.trim() },
        token!
      );
      setSuccess(true);
      setRating(0);
      setTitle("");
      setBody("");
      router.refresh();
      onSubmitted?.();
    } catch (err: any) {
      setError(err.message ?? "Failed to submit review. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Not logged in
  if (!token) {
    return (
      <div className="bg-[#F0E9E3]/60 border border-[#CDBBAD]/50 rounded-xl p-5 flex items-center gap-4">
        <LogIn size={20} className="text-[#5D1C34] flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-[#11100E]">Want to leave a review?</p>
          <p className="text-xs text-[#899581] mt-0.5">
            <Link href="/login" className="text-[#5D1C34] hover:underline font-medium">Sign in</Link>
            {" "}or{" "}
            <Link href="/register" className="text-[#5D1C34] hover:underline font-medium">create an account</Link>
            {" "}to share your experience.
          </p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-5 flex items-center gap-3">
        <CheckCircle size={18} className="text-green-600 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-green-800">Review submitted!</p>
          <p className="text-xs text-green-600 mt-0.5">Thank you for your feedback.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-[#CDBBAD]/50 p-5">
      <h3 className="font-semibold text-[#11100E] mb-4">Write a Review</h3>

      {error && (
        <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
          <AlertCircle size={14} className="flex-shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Star picker */}
        <div>
          <label className="block text-xs font-medium text-[#899581] mb-1.5">
            Rating <span className="text-red-400">*</span>
          </label>
          <div className="flex gap-1" role="radiogroup" aria-label="Star rating">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setRating(s)}
                onMouseEnter={() => setHovered(s)}
                onMouseLeave={() => setHovered(0)}
                aria-label={`${s} star${s !== 1 ? "s" : ""}`}
                className="transition-transform hover:scale-110"
              >
                <Star
                  size={28}
                  className={`transition-colors ${
                    s <= (hovered || rating)
                      ? "fill-amber-400 text-amber-400"
                      : "text-[#CDBBAD]"
                  }`}
                />
              </button>
            ))}
            {rating > 0 && (
              <span className="ml-2 text-sm text-[#899581] self-center">
                {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][rating]}
              </span>
            )}
          </div>
          {errors.rating && (
            <p className="text-xs text-red-500 mt-1">{errors.rating}</p>
          )}
        </div>

        {/* Title */}
        <div>
          <label className="block text-xs font-medium text-[#899581] mb-1">
            Review Title <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Summarise your experience"
            maxLength={100}
            className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5D1C34]/30 ${
              errors.title ? "border-red-400" : "border-[#CDBBAD]"
            }`}
          />
          {errors.title && (
            <p className="text-xs text-red-500 mt-1">{errors.title}</p>
          )}
        </div>

        {/* Body */}
        <div>
          <label className="block text-xs font-medium text-[#899581] mb-1">
            Review <span className="text-[#CDBBAD] font-normal">(optional)</span>
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Tell others what you think about this product…"
            rows={4}
            maxLength={1000}
            className="w-full border border-[#CDBBAD] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5D1C34]/30 resize-none"
          />
          <p className="text-xs text-[#CDBBAD] text-right mt-0.5">{body.length}/1000</p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-[#5D1C34] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#4a1628] disabled:opacity-60 transition-colors"
        >
          {loading ? "Submitting…" : "Submit Review"}
        </button>
      </form>
    </div>
  );
}
