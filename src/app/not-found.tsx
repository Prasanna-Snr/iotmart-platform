import Link from "next/link";
import { Search, Home, ShoppingBag, BookOpen } from "lucide-react";
import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Page Not Found | ${SITE_NAME}`,
  description: "The page you are looking for could not be found.",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F0E9E3] flex flex-col items-center justify-center px-4">
      {/* Decorative background element */}
      <div
        aria-hidden="true"
        className="absolute inset-0 overflow-hidden pointer-events-none"
      >
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#5D1C34]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-[#A67D45]/8 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-xl w-full text-center space-y-8">
        {/* 404 heading */}
        <div>
          <p className="text-[#A67D45] text-sm font-semibold uppercase tracking-widest mb-2">
            Error 404
          </p>
          <h1 className="text-8xl font-extrabold text-[#5D1C34] leading-none select-none">
            404
          </h1>
          <h2 className="mt-4 text-2xl font-bold text-[#11100E]">
            Page Not Found
          </h2>
          <p className="mt-2 text-[#899581]">
            Oops! The page you&apos;re looking for doesn&apos;t exist or has
            been moved.
          </p>
        </div>

        {/* Search bar */}
        <form
          action="/products"
          method="GET"
          className="flex items-center gap-2 max-w-md mx-auto"
          role="search"
        >
          <label htmlFor="not-found-search" className="sr-only">
            Search products
          </label>
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#899581]"
              aria-hidden="true"
            />
            <input
              id="not-found-search"
              type="search"
              name="search"
              placeholder="Search for products…"
              className={
                "w-full pl-9 pr-4 py-2.5 rounded-lg border border-[#CDBBAD] " +
                "bg-white text-[#11100E] placeholder-[#899581] text-sm " +
                "focus:outline-none focus:ring-2 focus:ring-[#5D1C34]/30 focus:border-[#5D1C34]"
              }
            />
          </div>
          <button
            type="submit"
            className={
              "px-4 py-2.5 rounded-lg bg-[#5D1C34] text-white text-sm font-medium " +
              "hover:bg-[#4a1628] focus:outline-none focus:ring-2 focus:ring-[#5D1C34]/30 " +
              "transition-colors whitespace-nowrap"
            }
          >
            Search
          </button>
        </form>

        {/* Helpful links */}
        <div>
          <p className="text-sm text-[#899581] mb-4">
            Or explore one of these pages:
          </p>
          <nav
            aria-label="Not found helpful navigation"
            className="flex flex-wrap justify-center gap-3"
          >
            <Link
              href="/"
              className={
                "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium " +
                "bg-white border border-[#CDBBAD] text-[#11100E] " +
                "hover:border-[#A67D45] hover:text-[#5D1C34] transition-colors"
              }
            >
              <Home size={15} aria-hidden="true" />
              Home
            </Link>
            <Link
              href="/products"
              className={
                "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium " +
                "bg-white border border-[#CDBBAD] text-[#11100E] " +
                "hover:border-[#A67D45] hover:text-[#5D1C34] transition-colors"
              }
            >
              <ShoppingBag size={15} aria-hidden="true" />
              Products
            </Link>
            <Link
              href="/tutorials"
              className={
                "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium " +
                "bg-white border border-[#CDBBAD] text-[#11100E] " +
                "hover:border-[#A67D45] hover:text-[#5D1C34] transition-colors"
              }
            >
              <BookOpen size={15} aria-hidden="true" />
              Tutorials
            </Link>
          </nav>
        </div>

        {/* Go back button */}
        <div>
          <Link
            href="/"
            className={
              "inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold " +
              "bg-[#5D1C34] text-white hover:bg-[#4a1628] " +
              "focus:outline-none focus:ring-2 focus:ring-[#5D1C34]/30 transition-colors"
            }
          >
            <Home size={16} aria-hidden="true" />
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
