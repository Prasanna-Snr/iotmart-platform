"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, AlertCircle, Pencil, Star } from "lucide-react";
import StarRating from "@/components/ui/StarRating";
import { formatDateShort } from "@/lib/utils";
import { getCustomerSession } from "@/lib/customerAuth";
import { reviewsApi } from "@/lib/api";

interface Review {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  title: string;
  body: string;
  date: string;
  verified: boolean;
}

interface Props {
  productId: string;
  reviews: Review[];
}

export default function ProductReviews({ productId, reviews }: Props) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Edit-form state
  const [rating, setRating]   = useState(0);
  const [hovered, setHovered] = useState(0);
  const [title, setTitle]     = useState("");
  const [body, setBody]       = useState("");
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");
  const [saved, setSaved]     = useState(false);

  useEffect(() => {
    setCurrentUserId(getCustomerSession()?.id ?? null);
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const startEdit = (review: Review) => {
    setEditingId(review.id);
    setRating(review.rating);
    setTitle(review.title);
    setBody(review.body);
    setError("");
    setSaved(false);
  };

  const saveEdit = async (reviewId: string) => {
    if (!rating) { setError("Please select a star rating."); return; }
    if (!title.trim()) { setError("Title is required."); return; }
    setSaving(true);
    setError("");
    try {
      await reviewsApi.update(
        reviewId,
        { rating, title: title.trim(), body: body.trim() },
        ""
      );
      setEditingId(null);
      setSaved(true);
      router.refresh();
    } catch (err: any) {
      setError(err.message ?? "Failed to update review.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {reviews.map((review) => {
        const isOwn = currentUserId !== null && currentUserId === review.userId;
        const isEditing = editingId === review.id;

        return (
          <div key={review.id} className="bg-white rounded-xl border border-[#CDBBAD]/50 p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-[#11100E]">{review.userName}</span>
                  {review.verified && (
                    <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Verified</span>
                  )}
                </div>
                <StarRating rating={review.rating} size={13} className="mt-1" />
              </div>
              <div className="flex items-center gap-3">
                <time className="text-xs text-[#899581]">{formatDateShort(review.date)}</time>
                {isOwn && !review.verified && !isEditing && (
                  <button
                    onClick={() => startEdit(review)}
                    className="flex items-center gap-1 text-xs text-[#5D1C34] font-medium hover:underline"
                  >
                    <Pencil size={12} /> Edit
                  </button>
                )}
              </div>
            </div>

            {isEditing ? (
              <div className="mt-3 space-y-3">
                {error && (
                  <p className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                    <AlertCircle size={13} /> {error}
                  </p>
                )}
                <div>
                  <span className="block text-xs font-medium text-[#899581] mb-1">Rating</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setRating(s)}
                        onMouseEnter={() => setHovered(s)}
                        onMouseLeave={() => setHovered(0)}
                        aria-label={`${s} stars`}
                      >
                        <Star
                          size={22}
                          className={`transition-colors ${
                            s <= (hovered || rating) ? "fill-amber-400 text-amber-400" : "text-[#CDBBAD]"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={100}
                  placeholder="Review title"
                  className="w-full border border-[#CDBBAD] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5D1C34]/30"
                />
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={3}
                  maxLength={1000}
                  placeholder="Tell others what you think…"
                  className="w-full border border-[#CDBBAD] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5D1C34]/30 resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => saveEdit(review.id)}
                    disabled={saving}
                    className="flex-1 bg-[#5D1C34] text-white py-2 rounded-lg text-sm font-medium hover:bg-[#4a1628] disabled:opacity-60"
                  >
                    {saving ? "Saving…" : "Save Changes"}
                  </button>
                  <button
                    onClick={() => { setEditingId(null); setError(""); }}
                    className="px-4 border border-[#CDBBAD] text-[#899581] py-2 rounded-lg text-sm hover:bg-[#F0E9E3]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h4 className="font-medium text-sm text-[#11100E] mb-1">{review.title}</h4>
                <p className="text-sm text-[#899581]">{review.body}</p>
              </>
            )}
          </div>
        );
      })}

      {saved && (
        <p className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <CheckCircle size={15} /> Review updated. Changes will appear shortly.
        </p>
      )}
    </div>
  );
}
