"use client";

import { useState } from "react";
import { ShoppingCart, Minus, Plus, Check } from "lucide-react";
import { useCart } from "@/context/CartContext";
import type { Product } from "@/types";
import { cn } from "@/lib/utils";

interface AddToCartSectionProps {
  product: Product;
}

export default function AddToCartSection({ product }: AddToCartSectionProps) {
  const { addToCart } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    addToCart(product, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const maxQty = Math.min(product.stock, 99);

  return (
    <div className="flex flex-col gap-4">
      {/* Quantity */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-[#11100E]">Quantity</span>
        <div className="flex items-center border border-[#CDBBAD] rounded-lg overflow-hidden">
          <button
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            disabled={qty <= 1}
            className="px-3 py-2 text-[#899581] hover:bg-[#F0E9E3] disabled:opacity-40 transition-colors"
            aria-label="Decrease quantity"
          >
            <Minus size={14} />
          </button>
          <span className="px-4 py-2 text-sm font-medium text-[#11100E] min-w-[40px] text-center border-x border-[#CDBBAD]">
            {qty}
          </span>
          <button
            onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
            disabled={qty >= maxQty}
            className="px-3 py-2 text-[#899581] hover:bg-[#F0E9E3] disabled:opacity-40 transition-colors"
            aria-label="Increase quantity"
          >
            <Plus size={14} />
          </button>
        </div>
        <span className="text-xs text-[#899581]">{product.stock} in stock</span>
      </div>

      {/* Add to cart button */}
      <button
        onClick={handleAdd}
        disabled={!product.inStock}
        className={cn(
          "flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold transition-all duration-200",
          product.inStock
            ? added
              ? "bg-green-600 text-white"
              : "bg-[#5D1C34] hover:bg-[#4a1628] text-white"
            : "bg-[#CDBBAD]/30 text-[#899581] cursor-not-allowed"
        )}
        aria-label={`Add ${product.name} to cart`}
      >
        {added ? (
          <>
            <Check size={16} />
            Added to Cart!
          </>
        ) : (
          <>
            <ShoppingCart size={16} />
            {product.inStock ? "Add to Cart" : "Out of Stock"}
          </>
        )}
      </button>
    </div>
  );
}
