import type { Metadata } from "next";
import type { Product, Tutorial } from "@/types";
import { SITE_NAME, SITE_URL } from "@/lib/constants";

export function generatePageMetadata(
  title: string,
  description?: string
): Metadata {
  return {
    title,
    description,
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true },
    },
    openGraph: {
      title: `${title} | ${SITE_NAME}`,
      description,
      siteName: SITE_NAME,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export function generateProductMetadata(product: Product): Metadata {
  const title = `${product.name} | ${SITE_NAME}`;
  const description = product.shortDescription;
  const url = `${SITE_URL}/products/${product.slug}`;
  const image = product.images[0];
  return {
    title,
    description,
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true },
    },
    openGraph: {
      title,
      description,
      url,
      images: [{ url: image, alt: product.name }],
      type: "website",
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export function generateTutorialMetadata(tutorial: Tutorial): Metadata {
  const title = `${tutorial.title} | ${SITE_NAME}`;
  const description = tutorial.shortDescription;
  const url = `${SITE_URL}/tutorials/${tutorial.slug}`;
  const image = tutorial.coverImage;
  return {
    title,
    description,
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true },
    },
    openGraph: {
      title,
      description,
      url,
      images: [{ url: image, alt: tutorial.title }],
      type: "article",
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export function productJsonLd(product: Product) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    sku: product.sku,
    brand: { "@type": "Brand", name: product.brand.name },
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: product.currency,
      availability: product.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url: `${SITE_URL}/products/${product.slug}`,
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: product.rating,
      reviewCount: product.reviewCount,
    },
  };
}

export function tutorialJsonLd(tutorial: Tutorial) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: tutorial.title,
    description: tutorial.description,
    author: { "@type": "Organization", name: tutorial.author },
    datePublished: tutorial.createdAt,
    dateModified: tutorial.updatedAt,
    image: tutorial.coverImage,
    url: `${SITE_URL}/tutorials/${tutorial.slug}`,
  };
}
