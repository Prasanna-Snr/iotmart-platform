/**
 * SEO utilities for IoTMart
 * ─────────────────────────
 * Covers:
 *  - Metadata helpers (Next.js Metadata API, generateMetadata pattern)
 *  - JSON-LD schemas: Organization, WebSite, Product, Article, HowTo,
 *    FAQPage, BreadcrumbList, Review
 *  - Canonical URL helpers
 *  - Open Graph & Twitter Card helpers
 */

import type { Metadata } from "next";
import type { Product, Tutorial, ProductReview } from "@/types";
import { SITE_NAME, SITE_URL, SITE_DESCRIPTION, CURRENCY } from "@/lib/constants";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Primary OG image served from /public */
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.png`;

const TWITTER_HANDLE = "@iotmart_np"; // update when you have a real handle

// ─── Canonical / URL helpers ─────────────────────────────────────────────────

export function canonicalUrl(path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${clean}`;
}

// ─── Generic page metadata ────────────────────────────────────────────────────

export function generatePageMetadata(
  title: string,
  options: {
    description?: string;
    path?: string;
    ogImage?: string;
    noIndex?: boolean;
  } = {}
): Metadata {
  const { description, path, ogImage, noIndex } = options;
  const canonical = path ? canonicalUrl(path) : undefined;
  const image = ogImage ?? DEFAULT_OG_IMAGE;

  return {
    title,
    description,
    ...(canonical && { alternates: { canonical } }),
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true, googleBot: { index: true, follow: true } },
    openGraph: {
      title: `${title} | ${SITE_NAME}`,
      description,
      ...(canonical && { url: canonical }),
      siteName: SITE_NAME,
      images: [{ url: image, width: 1200, height: 630, alt: title }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${SITE_NAME}`,
      description,
      images: [image],
      site: TWITTER_HANDLE,
    },
  };
}

// ─── Product metadata ─────────────────────────────────────────────────────────

export function generateProductMetadata(product: Product): Metadata {
  const title = `Buy ${product.name} — ${product.brand?.name ?? "IoTMart"} | ${SITE_NAME}`;
  const description = buildProductDescription(product);
  const url = canonicalUrl(`/products/${product.slug}`);
  const image = product.images[0] ?? DEFAULT_OG_IMAGE;

  return {
    title,
    description,
    alternates: { canonical: url },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      images: product.images.slice(0, 4).map((src, i) => ({
        url: src,
        width: 800,
        height: 800,
        alt: i === 0 ? product.name : `${product.name} — view ${i + 1}`,
      })),
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
      site: TWITTER_HANDLE,
    },
  };
}

function buildProductDescription(product: Product): string {
  const base = product.shortDescription || product.description?.slice(0, 155) || "";
  const suffix = `Buy ${product.name} (SKU: ${product.sku}) at IoTMart Nepal. Price: Rs. ${product.price.toLocaleString()}.`;
  // Trim so total stays ≤ 160 chars
  if ((base + " " + suffix).length <= 160) return `${base} ${suffix}`.trim();
  return base.slice(0, 155) + "…";
}

// ─── Tutorial metadata ────────────────────────────────────────────────────────

export function generateTutorialMetadata(tutorial: Tutorial): Metadata {
  const title = `${tutorial.title} — ${tutorial.difficulty} IoT Tutorial | ${SITE_NAME}`;
  const description =
    tutorial.shortDescription || tutorial.description?.slice(0, 155) || "";
  const url = canonicalUrl(`/tutorials/${tutorial.slug}`);
  const image = tutorial.coverImage ?? DEFAULT_OG_IMAGE;

  return {
    title,
    description,
    alternates: { canonical: url },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      images: [{ url: image, width: 1200, height: 630, alt: tutorial.title }],
      type: "article",
      publishedTime: tutorial.createdAt,
      modifiedTime: tutorial.updatedAt,
      authors: [tutorial.author],
      tags: tutorial.tags,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
      site: TWITTER_HANDLE,
    },
  };
}

// ─── JSON-LD: Organization ────────────────────────────────────────────────────

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/logo.png`,
      width: 200,
      height: 60,
    },
    description: SITE_DESCRIPTION,
    contactPoint: {
      "@type": "ContactPoint",
      email: "support@iotmart.com",
      contactType: "customer service",
      availableLanguage: "English",
    },
    sameAs: [
      "https://www.facebook.com/iotmart",
      "https://twitter.com/iotmart_np",
      "https://www.instagram.com/iotmart",
    ],
  };
}

// ─── JSON-LD: WebSite (enables Sitelinks Search Box) ─────────────────────────

export function webSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    publisher: { "@id": `${SITE_URL}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/products?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

// ─── JSON-LD: Product ─────────────────────────────────────────────────────────

export function productJsonLd(product: Product) {
  const url = canonicalUrl(`/products/${product.slug}`);

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name: product.name,
    description: product.description || product.shortDescription,
    sku: product.sku,
    url,
    brand: {
      "@type": "Brand",
      name: product.brand?.name ?? SITE_NAME,
    },
    image: product.images,
    offers: {
      "@type": "Offer",
      "@id": `${url}#offer`,
      url,
      priceCurrency: CURRENCY,
      price: product.price.toFixed(2),
      priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      itemCondition: "https://schema.org/NewCondition",
      availability: product.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      seller: {
        "@type": "Organization",
        name: SITE_NAME,
        url: SITE_URL,
      },
    },
    category: product.category?.name,
  };

  // AggregateRating — only include when there are actual reviews
  if (product.reviewCount > 0 && product.rating > 0) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: product.rating.toFixed(1),
      reviewCount: product.reviewCount,
      bestRating: "5",
      worstRating: "1",
    };
  }

  // Individual reviews (up to 5)
  if (product.reviews?.length > 0) {
    schema.review = product.reviews.slice(0, 5).map(reviewJsonLd);
  }

  return schema;
}

// ─── JSON-LD: Review ─────────────────────────────────────────────────────────

export function reviewJsonLd(review: ProductReview) {
  return {
    "@type": "Review",
    author: {
      "@type": "Person",
      name: review.userName,
    },
    reviewRating: {
      "@type": "Rating",
      ratingValue: review.rating,
      bestRating: "5",
      worstRating: "1",
    },
    name: review.title,
    reviewBody: review.body,
    datePublished: review.date,
  };
}

// ─── JSON-LD: Article (Tutorial) ─────────────────────────────────────────────

export function tutorialArticleJsonLd(tutorial: Tutorial) {
  const url = canonicalUrl(`/tutorials/${tutorial.slug}`);

  return {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    "@id": `${url}#article`,
    headline: tutorial.title,
    description: tutorial.shortDescription || tutorial.description?.slice(0, 155),
    image: tutorial.coverImage,
    url,
    author: {
      "@type": "Person",
      name: tutorial.author,
    },
    publisher: {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/logo.png`,
      },
    },
    datePublished: tutorial.createdAt,
    dateModified: tutorial.updatedAt,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    keywords: tutorial.tags?.join(", "),
    proficiencyLevel: tutorial.difficulty,
    dependencies: tutorial.components?.join(", "),
  };
}

// ─── JSON-LD: HowTo (Tutorial steps) ─────────────────────────────────────────

export function tutorialHowToJsonLd(tutorial: Tutorial) {
  const url = canonicalUrl(`/tutorials/${tutorial.slug}`);

  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "@id": `${url}#howto`,
    name: tutorial.title,
    description:
      tutorial.shortDescription || tutorial.description?.slice(0, 155),
    image: tutorial.coverImage,
    totalTime: `PT${tutorial.estimatedTime?.replace(/\s/g, "")}`,
    tool: tutorial.components?.map((c) => ({
      "@type": "HowToTool",
      name: c,
    })),
    step: tutorial.steps?.map((step) => ({
      "@type": "HowToStep",
      position: step.stepNumber,
      name: step.title,
      text: step.content,
      ...(step.image ? { image: step.image } : {}),
    })),
  };
}

// ─── JSON-LD: FAQPage ─────────────────────────────────────────────────────────

export interface FaqItem {
  question: string;
  answer: string;
}

export function faqPageJsonLd(items: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${SITE_URL}/faq#faqpage`,
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

// ─── JSON-LD: BreadcrumbList ──────────────────────────────────────────────────

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function breadcrumbJsonLd(items: BreadcrumbItem[], prefix?: string) {
  const allItems = [{ label: "Home", href: "/" }, ...items];

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: allItems.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      ...(item.href
        ? { item: canonicalUrl(item.href) }
        : {}),
    })),
  };
}

// ─── JSON-LD: ItemList (for listing pages) ────────────────────────────────────

export function productListJsonLd(products: Product[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "IoT Products",
    url: canonicalUrl("/products"),
    numberOfItems: products.length,
    itemListElement: products.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: canonicalUrl(`/products/${p.slug}`),
      name: p.name,
    })),
  };
}

export function tutorialListJsonLd(tutorials: Tutorial[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "IoT Tutorials",
    url: canonicalUrl("/tutorials"),
    numberOfItems: tutorials.length,
    itemListElement: tutorials.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: canonicalUrl(`/tutorials/${t.slug}`),
      name: t.title,
    })),
  };
}

// ─── Helper: Safe JSON-LD serialiser ─────────────────────────────────────────
// Use with: <script ... dangerouslySetInnerHTML={{ __html: jsonLdString(schema) }} />

export function jsonLdString(schema: Record<string, unknown> | object): string {
  // Remove undefined/null fields for clean output
  return JSON.stringify(schema, (_k, v) => (v == null ? undefined : v));
}
