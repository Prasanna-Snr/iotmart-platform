import type { Metadata } from "next";
import { productsApi, categoriesApi, brandsApi, type ProductListItem } from "@/lib/api";
import type { Product as UiProduct, Brand as UiBrand } from "@/types";

// ISR via per-fetch `next.revalidate` in api.ts (route-segment `revalidate`
// was removed in Next.js v16).
import ProductCard from "@/components/product/ProductCard";
import ProductFiltersPanel from "@/components/product/ProductFiltersPanel";
import PaginationLinks from "@/components/ui/PaginationLinks";
import EmptyState from "@/components/ui/EmptyState";
import { ITEMS_PER_PAGE, SITE_URL } from "@/lib/constants";
import {
  generatePageMetadata,
  productListJsonLd,
  jsonLdString,
} from "@/lib/seo";

// ─── Metadata ────────────────────────────────────────────────────────────────

export const metadata: Metadata = generatePageMetadata(
  "IoT Sensors, Microcontrollers & Dev Boards — Shop Online | IoTMart",
  {
    description:
      "Buy Arduino, ESP32, Raspberry Pi, sensors, robotics parts and IoT development boards. 200+ products with fast shipping in Nepal.",
    path: "/products",
    // alternates.canonical is set by generatePageMetadata via the path option,
    // but we also explicitly reinforce it here to satisfy the requirement.
  }
);

// Attach canonical via alternates (generatePageMetadata already does this via
// `path`, but we override to ensure SITE_URL is used consistently).
(metadata as Metadata).alternates = {
  canonical: `${SITE_URL}/products`,
};

// ─── Page ─────────────────────────────────────────────────────────────────────

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
    <>
      {/* JSON-LD ItemList — only injected when there are products */}
      {items.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLdString(
              productListJsonLd(items as unknown as UiProduct[])
            ),
          }}
        />
      )}

      <div id="main-content" className="container-custom py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#11100E]">All Products</h1>
          <p className="text-sm text-[#899581] mt-1">{total} product{total !== 1 ? "s" : ""} found</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <aside className="lg:w-60 flex-shrink-0">
            <ProductFiltersPanel
              categories={categories}
              brands={brands as unknown as UiBrand[]}
              currentParams={params}
            />
          </aside>

          <div className="flex-1 min-w-0">
            {items.length === 0 ? (
              <EmptyState title="No products found" description="Try adjusting your filters or search term." action={{ label: "Clear filters", href: "/products" }} />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {items.map((product: ProductListItem) => <ProductCard key={product.id} product={product} />)}
              </div>
            )}

            {totalPages > 1 && (
              <PaginationLinks
                currentPage={page}
                totalPages={totalPages}
                basePath="/products"
                params={params}
                className="mt-8"
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
