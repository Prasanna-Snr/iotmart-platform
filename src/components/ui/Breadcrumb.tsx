import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export default function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center text-sm", className)}
    >
      <ol className="flex items-center flex-wrap gap-1">
        <li>
          <Link
            href="/"
            className="flex items-center text-[#899581] hover:text-[#5D1C34] transition-colors"
            aria-label="Home"
          >
            <Home size={14} />
          </Link>
        </li>
        {items.map((item, idx) => (
          <li key={idx} className="flex items-center gap-1">
            <ChevronRight size={14} className="text-[#CDBBAD]" aria-hidden />
            {item.href && idx < items.length - 1 ? (
              <Link
                href={item.href}
                className="text-[#899581] hover:text-[#5D1C34] transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-[#11100E] font-medium" aria-current="page">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
