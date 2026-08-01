"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const getPages = (): (number | "…")[] => {
    const pages: (number | "…")[] = [];
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    pages.push(1);
    if (currentPage > 3) pages.push("…");
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push("…");
    pages.push(totalPages);
    return pages;
  };

  return (
    <nav
      aria-label="Pagination"
      className={cn("flex items-center justify-center gap-1", className)}
    >
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-2 rounded-lg border border-[#CDBBAD] text-[#11100E] hover:bg-[#5D1C34] hover:text-white hover:border-[#5D1C34] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        aria-label="Previous page"
      >
        <ChevronLeft size={16} />
      </button>

      {getPages().map((page, idx) =>
        page === "…" ? (
          <span key={`ellipsis-${idx}`} className="px-2 text-[#899581]">
            …
          </span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page as number)}
            aria-current={currentPage === page ? "page" : undefined}
            className={cn(
              "min-w-[36px] h-9 px-3 rounded-lg text-sm font-medium transition-colors border",
              currentPage === page
                ? "bg-[#5D1C34] text-white border-[#5D1C34]"
                : "border-[#CDBBAD] text-[#11100E] hover:bg-[#5D1C34] hover:text-white hover:border-[#5D1C34]"
            )}
          >
            {page}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-2 rounded-lg border border-[#CDBBAD] text-[#11100E] hover:bg-[#5D1C34] hover:text-white hover:border-[#5D1C34] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        aria-label="Next page"
      >
        <ChevronRight size={16} />
      </button>
    </nav>
  );
}
