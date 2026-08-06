"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingCart, Heart } from "lucide-react";
import type { Product } from "@/types";
import { formatPrice, calculateDiscount, cn } from "@/lib/utils";
import StarRating from "@/components/ui/StarRating";
import Badge from "@/components/ui/Badge";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";

interface ProductCardProps {
  product: Product;
  className?: string;
  compact?: boolean;
}

export default function ProductCard({
  product: raw,
  className,
  compact = false,
}: ProductCardProps) {
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();

  // Normalise: API returns snake_case, static data uses camelCase
  const product = {
    ...raw,
    originalPrice: (raw as any).originalPrice ?? (raw as any).original_price,
    inStock:       (raw as any).inStock       ?? (raw as any).in_stock ?? (raw as any).stock > 0,
    newArrival:    (raw as any).newArrival    ?? (raw as any).new_arrival,
    bestSeller:    (raw as any).bestSeller    ?? (raw as any).best_seller,
    reviewCount:   (raw as any).reviewCount   ?? (raw as any).review_count ?? 0,
    shortDescription: (raw as any).shortDescription ?? (raw as any).short_description ?? "",
    category: (raw as any).category ?? { name: "—", slug: "" },
    brand:    (raw as any).brand    ?? { name: "—", slug: "" },
    images:   (raw as any).images   ?? [],
  };

  const discount = product.originalPrice
    ? calculateDiscount(product.originalPrice, product.price)
    : 0;

  return (
    <article
      className={cn(
        "group bg-white rounded-xl border border-[#CDBBAD]/50 overflow-hidden",
        "shadow-sm hover:shadow-md hover:border-[#A67D45]/40 transition-all duration-200",
        className
      )}
    >
      {/* Image */}
      <Link href={`/products/${product.slug}`} className="block relative">
        <div className={cn("relative overflow-hidden bg-[#F0E9E3]", compact ? "h-44" : "h-52")}>
          {product.images?.[0] ? (
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[#CDBBAD]">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                <circle cx="9" cy="9" r="2"/>
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
              </svg>
            </div>
          )}
          {/* Badges overlay */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {discount > 0 && (
              <Badge variant="danger" size="sm">
                -{discount}%
              </Badge>
            )}
            {product.newArrival && (
              <Badge variant="info" size="sm">
                New
              </Badge>
            )}
            {product.bestSeller && (
              <Badge variant="warning" size="sm">
                Best Seller
              </Badge>
            )}
          </div>
          {/* Wishlist */}
          <button
            onClick={(e) => {
              e.preventDefault();
              toggleWishlist(product.id);
            }}
            className={`absolute top-2 right-2 p-1.5 rounded-full backdrop-blur-sm transition-colors opacity-0 group-hover:opacity-100 ${
              isInWishlist(product.id)
                ? "bg-[#5D1C34] text-white"
                : "bg-white/80 hover:text-red-500"
            }`}
            aria-label={isInWishlist(product.id) ? "Remove from wishlist" : "Add to wishlist"}
          >
            <Heart size={14} fill={isInWishlist(product.id) ? "currentColor" : "none"} />
          </button>
        </div>
      </Link>

      {/* Content */}
      <div className="p-4">
        <p className="text-xs text-[#899581] mb-1">{product.category.name}</p>
        <Link href={`/products/${product.slug}`}>
          <h3 className="text-sm font-semibold text-[#11100E] line-clamp-2 hover:text-[#5D1C34] transition-colors mb-2">
            {product.name}
          </h3>
        </Link>

        {/* Rating */}
        <div className="flex items-center gap-1.5 mb-3">
          <StarRating rating={product.rating} size={13} />
          <span className="text-xs text-[#899581]">({product.reviewCount})</span>
        </div>

        {/* Price & Cart */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-base font-bold text-[#11100E]">
              {formatPrice(product.price)}
            </span>
            {product.originalPrice && (
              <span className="ml-1.5 text-xs text-[#899581] line-through">
                {formatPrice(product.originalPrice)}
              </span>
            )}
          </div>
          <button
            onClick={() => addToCart(product, 1)}
            disabled={!product.inStock}
            className={cn(
              "flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors",
              product.inStock
                ? "bg-[#5D1C34] text-white hover:bg-[#4a1628]"
                : "bg-[#CDBBAD]/30 text-[#899581] cursor-not-allowed"
            )}
            aria-label={`Add ${product.name} to cart`}
          >
            <ShoppingCart size={13} />
            {product.inStock ? "Add" : "Out of Stock"}
          </button>
        </div>
      </div>
    </article>
  );
}
