import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Search, Package, BookOpen } from "lucide-react";
import { productsApi, tutorialsApi, type ProductListItem, type Tutorial } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { DIFFICULTY_COLORS } from "@/lib/constants";

interface PageProps {
  searchParams: Promise<Record<string, string>>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { q = "" } = await searchParams;
  return {
    title: q ? `Search results for "${q}" | IoTMart` : "Search | IoTMart",
  };
}

export default async function SearchPage({ searchParams }: PageProps) {
  const { q = "" } = await searchParams;
  const query = q.trim();

  // Fetch products and tutorials in parallel
  const [productsData, tutorialsData] = await Promise.all([
    query
      ? productsApi
          .list({ search: query, page_size: 8 })
          .catch(() => ({ items: [], total: 0 }))
      : Promise.resolve({ items: [], total: 0 }),

    query
      ? tutorialsApi
          .list({ search: query, published: true, page_size: 8 })
          .catch(() => ({ items: [], total: 0 }))
      : Promise.resolve({ items: [], total: 0 }),
  ]);

  const products  = productsData.items;
  const tutorials = tutorialsData.items;
  const totalResults = (productsData.total ?? 0) + (tutorialsData.total ?? 0);

  return (
    <div className="container-custom py-10">
      {/* Search bar */}
      <form method="get" action="/search" className="max-w-2xl mx-auto mb-10">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#899581]"
            />
            <input
              name="q"
              defaultValue={query}
              autoFocus={!query}
              placeholder="Search products and tutorials…"
              className="w-full pl-9 pr-4 py-3 border border-[#CDBBAD] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#5D1C34]/30 bg-white"
            />
          </div>
          <button
            type="submit"
            className="bg-[#5D1C34] text-white px-5 py-3 rounded-xl text-sm font-medium hover:bg-[#4a1628] transition-colors"
          >
            Search
          </button>
        </div>
      </form>

      {/* No query yet */}
      {!query && (
        <div className="text-center py-16 text-[#899581]">
          <Search size={48} className="mx-auto mb-4 text-[#CDBBAD]" />
          <p className="text-lg font-medium text-[#11100E] mb-1">Search IoTMart</p>
          <p className="text-sm">Find products, sensors, microcontrollers, and tutorials.</p>
        </div>
      )}

      {/* Query with no results */}
      {query && totalResults === 0 && (
        <div className="text-center py-16 text-[#899581]">
          <Search size={48} className="mx-auto mb-4 text-[#CDBBAD]" />
          <p className="text-lg font-medium text-[#11100E] mb-1">
            No results for &ldquo;{query}&rdquo;
          </p>
          <p className="text-sm mb-6">Try a different keyword or browse our categories.</p>
          <div className="flex gap-3 justify-center">
            <Link href="/products" className="text-sm text-[#5D1C34] border border-[#5D1C34] px-4 py-2 rounded-lg hover:bg-[#5D1C34] hover:text-white transition-colors">
              Browse Products
            </Link>
            <Link href="/tutorials" className="text-sm text-[#5D1C34] border border-[#5D1C34] px-4 py-2 rounded-lg hover:bg-[#5D1C34] hover:text-white transition-colors">
              Browse Tutorials
            </Link>
          </div>
        </div>
      )}

      {/* Results */}
      {query && totalResults > 0 && (
        <div className="space-y-10">
          <p className="text-sm text-[#899581]">
            <strong className="text-[#11100E]">{totalResults}</strong> result{totalResults !== 1 ? "s" : ""} for &ldquo;<strong className="text-[#11100E]">{query}</strong>&rdquo;
          </p>

          {/* ── Products ───────────────────────────────────────────── */}
          {products.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="flex items-center gap-2 font-bold text-[#11100E] text-lg">
                  <Package size={18} className="text-[#5D1C34]" />
                  Products
                  <span className="text-sm font-normal text-[#899581]">
                    ({productsData.total})
                  </span>
                </h2>
                {productsData.total > 8 && (
                  <Link
                    href={`/products?search=${encodeURIComponent(query)}`}
                    className="text-sm text-[#5D1C34] hover:underline"
                  >
                    View all {productsData.total} →
                  </Link>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {products.map((product: ProductListItem) => (
                  <Link
                    key={product.id}
                    href={`/products/${product.slug}`}
                    className="group bg-white rounded-xl border border-[#CDBBAD]/50 overflow-hidden hover:border-[#A67D45]/50 hover:shadow-md transition-all"
                  >
                    <div className="relative h-40 bg-[#F0E9E3]">
                      {product.images?.[0] ? (
                        <Image
                          src={product.images[0]}
                          alt={product.name}
                          fill
                          sizes="(max-width: 640px) 100vw, 25vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#CDBBAD] text-xs">
                          No Image
                        </div>
                      )}
                      {!product.in_stock && (
                        <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          Out of stock
                        </span>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-semibold text-[#11100E] line-clamp-2 group-hover:text-[#5D1C34] transition-colors">
                        {product.name}
                      </p>
                      <p className="text-sm font-bold text-[#A67D45] mt-1">
                        {formatPrice(product.price)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* ── Tutorials ──────────────────────────────────────────── */}
          {tutorials.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="flex items-center gap-2 font-bold text-[#11100E] text-lg">
                  <BookOpen size={18} className="text-[#5D1C34]" />
                  Tutorials
                  <span className="text-sm font-normal text-[#899581]">
                    ({tutorialsData.total})
                  </span>
                </h2>
                {tutorialsData.total > 8 && (
                  <Link
                    href={`/tutorials?search=${encodeURIComponent(query)}`}
                    className="text-sm text-[#5D1C34] hover:underline"
                  >
                    View all {tutorialsData.total} →
                  </Link>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {tutorials.map((tut: Tutorial) => (
                  <Link
                    key={tut.id}
                    href={`/tutorials/${tut.slug}`}
                    className="group bg-white rounded-xl border border-[#CDBBAD]/50 overflow-hidden hover:border-[#A67D45]/50 hover:shadow-md transition-all"
                  >
                    <div className="relative h-40 bg-[#F0E9E3]">
                      {tut.cover_image ? (
                        <Image
                          src={tut.cover_image}
                          alt={tut.title}
                          fill
                          sizes="(max-width: 640px) 100vw, 25vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#CDBBAD] text-xs">
                          No Image
                        </div>
                      )}
                      <span className={`absolute top-2 left-2 text-[10px] font-medium px-2 py-0.5 rounded-full ${DIFFICULTY_COLORS[tut.difficulty] ?? "bg-gray-100 text-gray-600"}`}>
                        {tut.difficulty}
                      </span>
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-semibold text-[#11100E] line-clamp-2 group-hover:text-[#5D1C34] transition-colors">
                        {tut.title}
                      </p>
                      <p className="text-xs text-[#899581] mt-1">
                        {tut.estimated_time}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
