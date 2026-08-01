import type { Metadata } from "next";
import Link from "next/link";
import { productsApi, categoriesApi, brandsApi } from "@/lib/api";
import ProductCard from "@/components/product/ProductCard";
import ProductFiltersPanel from "@/components/product/ProductFiltersPanel";
import EmptyState from "@/components/ui/EmptyState";
import { ITEMS_PER_PAGE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "All Products",
  description: "Browse our full range of IoT sensors, microcontrollers, modules, and development boards.",
};

interface PageProps { searchParams: Promise<Record<string, string>> }

export default async function ProductsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Number(params.page ?? 1);

  const [data, categories, brands] = await Promise.all([
    productsApi.list({
      category:  params.category,
      brand:     params.brand,
      search:    params.search,
      min_price: params.minPrice ? Number(params.minPrice) : undefined,
      max_price: params.maxPrice ? Number(params.maxPrice) : undefined,
      in_stock:  params.inStock === "true" ? true : undefined,
      page,
      page_size: ITEMS_PER_PAGE,
    }).catch(() => ({ items: [], total: 0, page: 1, page_size: ITEMS_PER_PAGE })),
    categoriesApi.list().catch(() => []),
    brandsApi.list().catch(() => []),
  ]);

  const { items, total } = data;
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  return (
    <div className="container-custom py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#11100E]">All Products</h1>
        <p className="text-sm text-[#899581] mt-1">{total} product{total !== 1 ? "s" : ""} found</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <aside className="lg:w-60 flex-shrink-0">
          <ProductFiltersPanel categories={categories} brands={brands} currentParams={params} />
        </aside>

        <div className="flex-1 min-w-0">
          {items.length === 0 ? (
            <EmptyState title="No products found" description="Try adjusting your filters or search term." action={{ label: "Clear filters", href: "/products" }} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {items.map((product: any) => <ProductCard key={product.id} product={product} />)}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-center gap-1 mt-8 flex-wrap">
              {Array.from({ length: totalPages }, (_, i) => {
                const p = { ...params, page: String(i + 1) };
                return (
                  <Link key={i} href={`/products?${new URLSearchParams(p).toString()}`}
                    className={`min-w-[36px] h-9 px-3 rounded-lg text-sm font-medium border inline-flex items-center justify-center transition-colors ${page === i + 1 ? "bg-[#5D1C34] text-white border-[#5D1C34]" : "border-[#CDBBAD] text-[#11100E] hover:bg-[#5D1C34] hover:text-white"}`}>
                    {i + 1}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
