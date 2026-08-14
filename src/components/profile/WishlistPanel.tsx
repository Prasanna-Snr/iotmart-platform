"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, Trash2, ShoppingCart } from "lucide-react";
import { wishlistApi, type WishlistItem } from "@/lib/api";
import type { Product as UiProduct } from "@/types";
import { formatPrice } from "@/lib/utils";
import { useCart } from "@/context/CartContext";

interface Props {
  token: string;
}

export default function WishlistPanel({ token }: Props) {
  const { addToCart } = useCart();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    wishlistApi
      .list(token)
      .then(setItems)
      .catch((e) => setError(e.message ?? "Failed to load wishlist."))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const handleRemove = async (productId: string) => {
    setError("");
    try {
      await wishlistApi.remove(productId, token);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove item.");
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-[#11100E]">Your Wishlist</h2>

      {error && (
        <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}

      {loading && <p className="text-sm text-[#899581] py-8 text-center">Loading wishlist…</p>}

      {!loading && items.length === 0 && (
        <div className="bg-white border border-[#CDBBAD]/50 rounded-xl py-14 text-center">
          <Heart size={28} className="mx-auto text-[#CDBBAD] mb-3" />
          <p className="text-sm text-[#899581] mb-3">Your wishlist is empty.</p>
          <Link href="/products" className="text-sm text-[#5D1C34] font-medium hover:underline">
            Browse products
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {items.map((item) => {
          const inStock = item.product.in_stock ?? (item.product.stock ?? 0) > 0;
          return (
            <div key={item.id} className="bg-white border border-[#CDBBAD]/50 rounded-xl p-4 flex gap-4">
              <Link href={`/products/${item.product.slug}`} className="relative w-20 h-20 rounded-lg overflow-hidden bg-[#F0E9E3] flex-shrink-0">
                {item.product.images?.[0] ? (
                  <Image src={item.product.images[0]} alt={item.product.name} fill sizes="80px" className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#CDBBAD] text-xs">IMG</div>
                )}
              </Link>
              <div className="flex-1 min-w-0">
                <Link href={`/products/${item.product.slug}`}>
                  <p className="text-sm font-semibold text-[#11100E] line-clamp-2 hover:text-[#5D1C34] transition-colors">
                    {item.product.name}
                  </p>
                </Link>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-bold text-[#11100E]">{formatPrice(item.product.price)}</span>
                  {item.product.original_price && (
                    <span className="text-xs text-[#899581] line-through">
                      {formatPrice(item.product.original_price)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => addToCart(item.product as unknown as UiProduct, 1)}
                    disabled={!inStock}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-[#5D1C34] text-white hover:bg-[#4a1628] disabled:bg-[#CDBBAD]/30 disabled:text-[#899581] disabled:cursor-not-allowed transition-colors"
                  >
                    <ShoppingCart size={12} /> Add
                  </button>
                  <button
                    onClick={() => handleRemove(item.product.id)}
                    className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-[#CDBBAD] text-[#899581] hover:text-red-500 hover:border-red-300 transition-colors"
                  >
                    <Trash2 size={12} /> Remove
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
