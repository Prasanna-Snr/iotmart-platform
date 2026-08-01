"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Category, Brand } from "@/types";

interface ProductFiltersPanelProps {
  categories: Category[];
  brands: Brand[];
  currentParams: Record<string, string>;
}

export default function ProductFiltersPanel({
  categories,
  brands,
  currentParams,
}: ProductFiltersPanelProps) {
  const buildUrl = (key: string, value: string) => {
    const p: Record<string, string> = { ...currentParams, [key]: value };
    delete p.page;
    if (!value) delete p[key];
    return `/products?${new URLSearchParams(p).toString()}`;
  };

  const clearUrl = () => "/products";

  return (
    <div className="bg-white rounded-xl border border-[#CDBBAD]/50 p-4 space-y-5 text-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-[#11100E]">Filters</h2>
        {Object.keys(currentParams).some((k) =>
          ["category", "brand", "minPrice", "maxPrice", "inStock"].includes(k)
        ) && (
          <Link href={clearUrl()} className="text-xs text-[#5D1C34] hover:underline">
            Clear all
          </Link>
        )}
      </div>

      {/* Category */}
      <div>
        <h3 className="font-medium text-[#11100E] mb-2">Category</h3>
        <ul className="space-y-1">
          <li>
            <Link
              href={buildUrl("category", "")}
              className={`block px-2 py-1 rounded transition-colors ${
                !currentParams.category
                  ? "bg-[#5D1C34]/10 text-[#5D1C34] font-medium"
                  : "text-[#899581] hover:text-[#11100E]"
              }`}
            >
              All Categories
            </Link>
          </li>
          {categories.map((cat) => (
            <li key={cat.id}>
              <Link
                href={buildUrl("category", cat.slug)}
                className={`flex justify-between px-2 py-1 rounded transition-colors ${
                  currentParams.category === cat.slug
                    ? "bg-[#5D1C34]/10 text-[#5D1C34] font-medium"
                    : "text-[#899581] hover:text-[#11100E]"
                }`}
              >
                <span>{cat.name}</span>
                <span className="text-xs">{cat.productCount}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Brand */}
      <div>
        <h3 className="font-medium text-[#11100E] mb-2">Brand</h3>
        <ul className="space-y-1">
          {brands.map((br) => (
            <li key={br.id}>
              <Link
                href={buildUrl("brand", br.slug)}
                className={`block px-2 py-1 rounded transition-colors ${
                  currentParams.brand === br.slug
                    ? "bg-[#5D1C34]/10 text-[#5D1C34] font-medium"
                    : "text-[#899581] hover:text-[#11100E]"
                }`}
              >
                {br.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* In Stock */}
      <div>
        <h3 className="font-medium text-[#11100E] mb-2">Availability</h3>
        <Link
          href={
            currentParams.inStock === "true"
              ? buildUrl("inStock", "")
              : buildUrl("inStock", "true")
          }
          className={`flex items-center gap-2 px-2 py-1 rounded transition-colors ${
            currentParams.inStock === "true"
              ? "bg-[#5D1C34]/10 text-[#5D1C34]"
              : "text-[#899581] hover:text-[#11100E]"
          }`}
        >
          <span
            className={`w-4 h-4 rounded border flex items-center justify-center ${
              currentParams.inStock === "true"
                ? "bg-[#5D1C34] border-[#5D1C34] text-white"
                : "border-[#CDBBAD]"
            }`}
          >
            {currentParams.inStock === "true" && (
              <svg width="10" height="8" viewBox="0 0 10 8" fill="currentColor">
                <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
              </svg>
            )}
          </span>
          In Stock Only
        </Link>
      </div>
    </div>
  );
}
