import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Tag } from "lucide-react";
import { productsApi, type ProductListItem, type Review } from "@/lib/api";
import type { Product as UiProduct } from "@/types";
import ProductGallery from "@/components/product/ProductGallery";
import AddToCartSection from "@/components/product/AddToCartSection";
import ProductCard from "@/components/product/ProductCard";
import StarRating from "@/components/ui/StarRating";
import Badge from "@/components/ui/Badge";
import Breadcrumb from "@/components/ui/Breadcrumb";
import { formatPrice, calculateDiscount } from "@/lib/utils";
import {
  generateProductMetadata,
  productJsonLd,
  breadcrumbJsonLd,
  jsonLdString,
} from "@/lib/seo";
import WriteReviewForm from "@/components/product/WriteReviewForm";
import ProductReviews from "@/components/product/ProductReviews";

interface PageProps {
  params: Promise<{ slug: string }>;
}

interface ProductSpecRow {
  label: string;
  value: string;
}

/** Source shape accepted by the mapper: a full detail response, or a list item
 *  (which omits `description` and `reviews` — read defensively below). */
interface ProductMapSource extends ProductListItem {
  description?: string;
  reviews?: Review[];
}

/** Map API snake_case product to the camelCase Product type used by components */
function mapProduct(p: ProductMapSource) {
  // Only approved (verified) reviews are shown on the storefront. Rating and
  // count are derived from that same set so they match what's displayed.
  const approved = (p.reviews ?? []).filter((r) => r.verified);
  return {
    id:               p.id,
    name:             p.name,
    slug:             p.slug,
    sku:              p.sku,
    description:      p.description ?? "",
    shortDescription: p.short_description ?? "",
    price:            p.price,
    originalPrice:    p.original_price ?? undefined,
    currency:         p.currency ?? "USD",
    images:           p.images ?? [],
    category:         p.category ?? { id: "", name: "Uncategorized", slug: "" },
    brand:            p.brand ?? { id: "", name: "Unknown", slug: "" },
    tags:             p.tags ?? [],
    specs:            p.specs ?? [],
    stock:            p.stock ?? 0,
    rating:           approved.length
      ? Math.round((approved.reduce((s, r) => s + (r.rating ?? 0), 0) / approved.length) * 10) / 10
      : 0,
    reviewCount:      approved.length,
    reviews:          approved.map((r) => ({
      id:          r.id,
      userId:      r.user_id,
      userName:    r.user_name,
      userAvatar:  r.user_avatar ?? undefined,
      rating:      r.rating,
      title:       r.title,
      body:        r.body,
      date:        r.created_at,
      verified:    r.verified ?? false,
    })),
    featured:           p.featured ?? false,
    newArrival:         p.new_arrival ?? false,
    bestSeller:         p.best_seller ?? false,
    inStock:            p.in_stock ?? p.stock > 0,
    weight:             p.weight,
    dimensions:         p.dimensions,
    relatedProductIds:  p.related_product_ids ?? [],
    createdAt:          p.created_at,
    updatedAt:          p.updated_at,
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const raw = await productsApi.get(slug);
    const product = mapProduct(raw);
    return generateProductMetadata(product as unknown as UiProduct);
  } catch {
    return {};
  }
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;

  let product: ReturnType<typeof mapProduct>;
  try {
    const raw = await productsApi.get(slug);
    if (!raw) notFound();
    product = mapProduct(raw);
  } catch {
    notFound();
  }

  const discount = product.originalPrice
    ? calculateDiscount(product.originalPrice, product.price)
    : 0;

  // Fetch related products if any ids are listed
  let relatedProducts: ReturnType<typeof mapProduct>[] = [];
  if (product.relatedProductIds.length > 0) {
    try {
      const related = await productsApi.list({ page_size: 4 });
      relatedProducts = related.items
        .filter((p: ProductListItem) => p.id !== product.id)
        .slice(0, 4)
        .map(mapProduct);
    } catch { /* non-fatal */ }
  }

  const jsonLd = productJsonLd(product as unknown as UiProduct);
  const crumbJsonLd = breadcrumbJsonLd([
    { label: "Products", href: "/products" },
    { label: product.category.name, href: `/products?category=${product.category.slug}` },
    { label: product.name },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(crumbJsonLd) }}
      />

      <div id="main-content" className="container-custom py-8">
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: "Products", href: "/products" },
            { label: product.category.name, href: `/products?category=${product.category.slug}` },
            { label: product.name },
          ]}
          className="mb-6"
        />

        {/* Product main */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-16">
          {/* Gallery */}
          <ProductGallery images={product.images} productName={product.name} />

          {/* Info */}
          <div>
            <div className="flex flex-wrap gap-2 mb-3">
              {product.bestSeller && <Badge variant="warning">Best Seller</Badge>}
              {product.newArrival && <Badge variant="info">New Arrival</Badge>}
              {discount > 0 && <Badge variant="danger">-{discount}% OFF</Badge>}
            </div>

            <h1 className="text-2xl md:text-3xl font-bold text-[#11100E] mb-2">
              {product.name}
            </h1>

            <div className="flex items-center gap-3 mb-4">
              <StarRating rating={product.rating} size={16} showValue />
              <span className="text-sm text-[#899581]">({product.reviewCount} reviews)</span>
              <span className="text-xs text-[#CDBBAD]">|</span>
              <span className="text-sm text-[#899581]">SKU: {product.sku}</span>
            </div>

            <div className="flex items-baseline gap-3 mb-2">
              <span className="text-3xl font-bold text-[#11100E]">{formatPrice(product.price)}</span>
              {product.originalPrice && (
                <span className="text-lg text-[#899581] line-through">{formatPrice(product.originalPrice)}</span>
              )}
            </div>

            <div className="flex items-center gap-2 mb-6">
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${product.inStock ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${product.inStock ? "bg-green-500" : "bg-red-500"}`} />
                {product.inStock ? "In Stock" : "Out of Stock"}
              </span>
              {product.brand?.name && (
                <span className="text-xs text-[#899581]">
                  Brand:{" "}
                  <Link href={`/products?brand=${product.brand.slug}`} className="text-[#5D1C34] hover:underline">
                    {product.brand.name}
                  </Link>
                </span>
              )}
            </div>

            <p className="text-sm text-[#899581] leading-relaxed mb-6">{product.shortDescription}</p>

            <AddToCartSection product={product as unknown as UiProduct} />

            {/* Tags */}
            {product.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-6">
                {product.tags.map((tag: string) => (
                  <Link key={tag} href={`/products?search=${tag}`}
                    className="inline-flex items-center gap-1 bg-[#F0E9E3] text-[#899581] hover:text-[#5D1C34] text-xs px-2.5 py-1 rounded-full transition-colors">
                    <Tag size={11} />{tag}
                  </Link>
                ))}
              </div>
            )}

            {/* Description inline */}
            {product.description && (
              <p className="text-sm text-[#899581] leading-relaxed mt-5">{product.description}</p>
            )}
          </div>
        </div>

        {/* Specs / Reviews */}
        <div className="grid grid-cols-1 gap-8 mb-16">
          <div className="space-y-8">

            {product.specs.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-[#11100E] mb-4">Specifications</h2>
                <div className="bg-white rounded-xl border border-[#CDBBAD]/50 overflow-hidden">
                  <table className="w-full text-sm">
                    <tbody>
                      {(product.specs as unknown as ProductSpecRow[]).map((spec, idx: number) => (
                        <tr key={idx} className={idx % 2 === 0 ? "bg-[#F0E9E3]/40" : "bg-white"}>
                          <td className="px-4 py-3 font-medium text-[#11100E] w-1/3">{spec.label}</td>
                          <td className="px-4 py-3 text-[#899581]">{spec.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            <section>
              <h2 className="text-xl font-bold text-[#11100E] mb-4">Customer Reviews</h2>
              {product.reviews.length === 0 ? (
                <p className="text-sm text-[#899581]">No reviews yet. Be the first to review this product!</p>
              ) : (
                <ProductReviews productId={product.id} reviews={product.reviews} />
              )}
              <div className="mt-6">
                <WriteReviewForm productId={product.id} />
              </div>
            </section>
          </div>
        </div>

        {/* Related products */}
        {relatedProducts.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-[#11100E] mb-5">Related Products</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {relatedProducts.map((p) => <ProductCard key={p.id} product={p as unknown as UiProduct} compact />)}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
