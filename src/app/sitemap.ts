import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/constants";
import { productsApi, tutorialsApi } from "@/lib/api";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL,                   lastModified: now, changeFrequency: "daily",   priority: 1.0 },
    { url: `${SITE_URL}/products`,     lastModified: now, changeFrequency: "daily",   priority: 0.9 },
    { url: `${SITE_URL}/tutorials`,    lastModified: now, changeFrequency: "weekly",  priority: 0.9 },
    { url: `${SITE_URL}/about`,        lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/contact`,      lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/faq`,          lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/cart`,         lastModified: now, changeFrequency: "never",   priority: 0.3 },
    { url: `${SITE_URL}/login`,        lastModified: now, changeFrequency: "never",   priority: 0.4 },
    { url: `${SITE_URL}/register`,     lastModified: now, changeFrequency: "never",   priority: 0.4 },
    { url: `${SITE_URL}/shipping`,     lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/returns`,      lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/privacy`,      lastModified: now, changeFrequency: "monthly", priority: 0.3 },
  ];

  // Fetch all products from API (up to 1000)
  let productRoutes: MetadataRoute.Sitemap = [];
  try {
    const data = await productsApi.list({ page: 1, page_size: 1000 });
    productRoutes = data.items.map((p: any) => ({
      url:             `${SITE_URL}/products/${p.slug}`,
      lastModified:    p.updated_at ? new Date(p.updated_at) : now,
      changeFrequency: "weekly" as const,
      priority:        p.featured || p.best_seller ? 0.8 : 0.7,
    }));
  } catch { /* non-fatal — omit product URLs if API is down */ }

  // Fetch all tutorials from API (up to 1000)
  let tutorialRoutes: MetadataRoute.Sitemap = [];
  try {
    const data = await tutorialsApi.list({ page: 1, page_size: 1000, published: true });
    tutorialRoutes = data.items.map((t: any) => ({
      url:             `${SITE_URL}/tutorials/${t.slug}`,
      lastModified:    t.updated_at ? new Date(t.updated_at) : now,
      changeFrequency: "monthly" as const,
      priority:        t.featured ? 0.8 : 0.7,
    }));
  } catch { /* non-fatal */ }

  return [...staticRoutes, ...productRoutes, ...tutorialRoutes];
}
