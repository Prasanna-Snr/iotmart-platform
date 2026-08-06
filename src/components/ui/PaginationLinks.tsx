import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationLinksProps {
  currentPage: number;
  totalPages:  number;
  basePath:    string;               // e.g. "/products"
  params:      Record<string, string>; // existing search params (filters etc.)
  className?:  string;
}

function buildHref(basePath: string, params: Record<string, string>, page: number) {
  const p = new URLSearchParams(params);
  p.set("page", String(page));
  return `${basePath}?${p.toString()}`;
}

function getPageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | "…")[] = [1];
  if (current > 3)              pages.push("…");
  const start = Math.max(2, current - 1);
  const end   = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2)     pages.push("…");
  pages.push(total);
  return pages;
}

const base =
  "min-w-[36px] h-9 px-3 rounded-lg text-sm font-medium border inline-flex items-center justify-center transition-colors";
const active   = "bg-[#5D1C34] text-white border-[#5D1C34]";
const inactive = "border-[#CDBBAD] text-[#11100E] hover:bg-[#5D1C34] hover:text-white hover:border-[#5D1C34]";
const arrow    = "p-2 rounded-lg border border-[#CDBBAD] text-[#11100E] hover:bg-[#5D1C34] hover:text-white hover:border-[#5D1C34] transition-colors";
const disabled = "opacity-40 pointer-events-none";

export default function PaginationLinks({
  currentPage,
  totalPages,
  basePath,
  params,
  className = "",
}: PaginationLinksProps) {
  if (totalPages <= 1) return null;

  // Strip existing page param so we build cleanly
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([k]) => k !== "page")
  );

  const pages = getPageNumbers(currentPage, totalPages);

  return (
    <nav
      aria-label="Pagination"
      className={`flex items-center justify-center gap-1 flex-wrap ${className}`}
    >
      {/* Prev */}
      {currentPage <= 1 ? (
        <span className={`${arrow} ${disabled}`} aria-disabled="true">
          <ChevronLeft size={16} />
        </span>
      ) : (
        <Link
          href={buildHref(basePath, cleanParams, currentPage - 1)}
          className={arrow}
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </Link>
      )}

      {/* Page numbers */}
      {pages.map((page, idx) =>
        page === "…" ? (
          <span key={`ellipsis-${idx}`} className="px-2 text-[#899581] select-none">
            …
          </span>
        ) : (
          <Link
            key={page}
            href={buildHref(basePath, cleanParams, page)}
            aria-current={currentPage === page ? "page" : undefined}
            className={`${base} ${currentPage === page ? active : inactive}`}
          >
            {page}
          </Link>
        )
      )}

      {/* Next */}
      {currentPage >= totalPages ? (
        <span className={`${arrow} ${disabled}`} aria-disabled="true">
          <ChevronRight size={16} />
        </span>
      ) : (
        <Link
          href={buildHref(basePath, cleanParams, currentPage + 1)}
          className={arrow}
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </Link>
      )}
    </nav>
  );
}
