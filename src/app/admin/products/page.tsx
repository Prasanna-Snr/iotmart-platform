import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import { productsApi, categoriesApi, type Category, type ProductListItem } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import DeleteProductButton from "@/components/admin/DeleteProductButton";

export const metadata: Metadata = { title: "Products | Admin" };

interface PageProps { searchParams: Promise<Record<string, string>> }

export default async function AdminProductsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Number(params.page ?? 1);

  const [data, categories] = await Promise.all([
    productsApi.list({
      search:   params.search,
      category: params.category,
      page,
      page_size: 20,
    }, { cache: "no-store" }).catch(() => ({ items: [], total: 0, page: 1, page_size: 20 })),
    categoriesApi.list().catch(() => []),
  ]);

  const { items: products, total } = data;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#11100E]">Products</h1>
          <p className="text-xs text-[#899581] mt-0.5">{total} total products</p>
        </div>
        <Link href="/admin/products/new"
          className="flex items-center gap-1.5 bg-[#5D1C34] text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-[#4a1628]">
          <Plus size={14} /> Add Product
        </Link>
      </div>

      {/* Filters */}
      <form method="get" className="flex gap-3 mb-5 flex-wrap">
        <input name="search" defaultValue={params.search ?? ""} placeholder="Search products…"
          className="border border-[#CDBBAD] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5D1C34]/30 flex-1 min-w-[200px]" />
        <select name="category" defaultValue={params.category ?? ""}
          className="border border-[#CDBBAD] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5D1C34]/30">
          <option value="">All Categories</option>
          {categories.map((c: Category) => <option key={c.id} value={c.slug}>{c.name}</option>)}
        </select>
        <button type="submit" className="bg-[#5D1C34] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#4a1628]">
          Filter
        </button>
        {(params.search || params.category) && (
          <Link href="/admin/products" className="px-4 py-2 border border-[#CDBBAD] rounded-lg text-sm text-[#899581] hover:bg-[#F0E9E3]">
            Clear
          </Link>
        )}
      </form>

      <div className="bg-white rounded-xl border border-[#CDBBAD]/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#F0E9E3]">
              <tr>
                {["Product","SKU","Category","Price","Stock","Rating","Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#899581]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0E9E3]">
              {products.map((p: ProductListItem) => (
                <tr key={p.id} className="hover:bg-[#F0E9E3]/40 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {p.images?.[0] && (
                        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-[#F0E9E3]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div>
                        <Link href={`/admin/products/${p.id}`} className="font-medium text-[#11100E] text-sm line-clamp-1 hover:text-[#5D1C34] transition-colors">
                          {p.name}
                        </Link>
                        <p className="text-xs text-[#899581]">{p.brand?.name ?? "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-[#899581]">{p.sku}</td>
                  <td className="px-4 py-3 text-sm text-[#899581]">{p.category?.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div>
                      <span className="font-semibold text-[#11100E] text-sm">{formatPrice(p.price)}</span>
                      {p.original_price && (
                        <span className="ml-1 text-xs text-[#899581] line-through">{formatPrice(p.original_price)}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-medium ${p.stock > 10 ? "text-green-600" : p.stock > 0 ? "text-amber-600" : "text-red-500"}`}>
                      {p.stock}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-[#899581]">★ {p.rating?.toFixed(1) ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Link href={`/admin/products/${p.id}/edit`} className="p-1.5 rounded-lg text-[#5D1C34] hover:bg-[#5D1C34]/10 inline-flex" title="Edit product">
                        <Pencil size={14} />
                      </Link>
                      <DeleteProductButton id={p.id} name={p.name} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {products.length === 0 && (
          <div className="text-center py-12 text-[#899581] text-sm">No products yet.</div>
        )}
      </div>
    </div>
  );
}
