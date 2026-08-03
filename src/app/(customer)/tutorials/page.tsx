import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { tutorialsApi } from "@/lib/api";
import TutorialCard from "@/components/tutorial/TutorialCard";
import PaginationLinks from "@/components/ui/PaginationLinks";
import { DIFFICULTY_COLORS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "IoT Project Tutorials",
  description: "Free step-by-step IoT project tutorials for beginners to advanced makers.",
};

interface PageProps { searchParams: Promise<Record<string, string>> }

export default async function TutorialsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Number(params.page ?? 1);
  const PAGE_SIZE = 9;

  const [data, categories] = await Promise.all([
    tutorialsApi.list({
      category:   params.category,
      difficulty: params.difficulty,
      search:     params.search,
      published:  true,
      page,
      page_size:  PAGE_SIZE,
    }).catch(() => ({ items: [], total: 0, page: 1, page_size: PAGE_SIZE })),
    tutorialsApi.categories().catch(() => []),
  ]);

  const { items, total } = data;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="container-custom py-8">
      <div className="text-center mb-10">
        <span className="inline-flex items-center gap-2 bg-[#5D1C34]/10 text-[#5D1C34] text-sm font-medium px-3 py-1 rounded-full mb-3">
          <BookOpen size={14} /> Free Tutorials
        </span>
        <h1 className="text-3xl md:text-4xl font-bold text-[#11100E] mb-3">IoT Project Tutorials</h1>
        <p className="text-[#899581] max-w-xl mx-auto">
          Step-by-step guides covering sensors, microcontrollers, and IoT projects — from beginner to advanced.
        </p>
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2 justify-center mb-4">
        <Link href="/tutorials"
          className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${!params.category ? "bg-[#5D1C34] text-white border-[#5D1C34]" : "border-[#CDBBAD] text-[#899581] hover:border-[#5D1C34]"}`}>
          All
        </Link>
        {categories.map((cat: any) => {
          const p = new URLSearchParams(params); p.set("category", cat.slug); p.delete("page");
          return (
            <Link key={cat.id} href={`/tutorials?${p.toString()}`}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${params.category === cat.slug ? "bg-[#5D1C34] text-white border-[#5D1C34]" : "border-[#CDBBAD] text-[#899581] hover:border-[#5D1C34]"}`}>
              {cat.name}
            </Link>
          );
        })}
      </div>

      {/* Difficulty filters */}
      <div className="flex flex-wrap gap-2 justify-center mb-8">
        {["Beginner", "Intermediate", "Advanced"].map((diff) => {
          const p = new URLSearchParams(params); p.set("difficulty", diff); p.delete("page");
          return (
            <Link key={diff} href={`/tutorials?${p.toString()}`}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${params.difficulty === diff ? DIFFICULTY_COLORS[diff] : "bg-[#F0E9E3] text-[#899581] hover:text-[#11100E]"}`}>
              {diff}
            </Link>
          );
        })}
        {params.difficulty && (
          <Link href="/tutorials" className="px-3 py-1 rounded-full text-xs text-[#5D1C34] hover:underline">
            Clear ×
          </Link>
        )}
      </div>

      <p className="text-sm text-[#899581] mb-4">{total} tutorial{total !== 1 ? "s" : ""} found</p>

      {items.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#CDBBAD]/50 p-12 text-center">
          <BookOpen size={48} className="mx-auto text-[#CDBBAD] mb-4" />
          <p className="text-[#899581]">No tutorials found.</p>
          <Link href="/tutorials" className="mt-3 inline-block text-[#5D1C34] text-sm hover:underline">
            Clear filters
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {items.map((tut: any) => <TutorialCard key={tut.id} tutorial={tut} />)}
        </div>
      )}

      {totalPages > 1 && (
        <PaginationLinks
          currentPage={page}
          totalPages={totalPages}
          basePath="/tutorials"
          params={params}
          className="mt-8"
        />
      )}
    </div>
  );
}
