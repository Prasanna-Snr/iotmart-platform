import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BlockPreview from "@/components/admin/BlockPreview";
import { apiPageToLocal } from "@/lib/cms-store";
import { SITE_NAME } from "@/lib/constants";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await fetchCmsPage(slug);
  if (!page) return { title: `${SITE_NAME}` };
  return {
    title: `${page.title} | ${SITE_NAME}`,
    description: `CMS page — ${page.title}`,
  };
}

async function fetchCmsPage(slug: string) {
  const apiBase = process.env.API_INTERNAL_URL ?? "http://localhost:8000";
  const res = await fetch(`${apiBase}/api/cms/pages/slug/${slug}`, { cache: "no-store" })
    .catch(() => null);
  if (!res || !res.ok) return null;
  return apiPageToLocal(await res.json());
}

export default async function CmsPage({ params }: PageProps) {
  const { slug } = await params;
  const page = await fetchCmsPage(slug);

  if (!page || page.status !== "published") notFound();

  return (
    <main className="container-custom py-10 md:py-16">
      <article>
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-[#11100E]">{page.title}</h1>
        </header>
        <div>
          {page.blocks.length > 0 ? (
            page.blocks.map((b) => <BlockPreview key={b.id} block={b} />)
          ) : (
            <p className="text-[#899581] text-sm">This page has no content yet.</p>
          )}
        </div>
      </article>
    </main>
  );
}
