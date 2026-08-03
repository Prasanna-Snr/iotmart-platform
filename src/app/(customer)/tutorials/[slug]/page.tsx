import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Clock, Eye, User, CheckCircle } from "lucide-react";
import { tutorialsApi, productsApi } from "@/lib/api";
import TutorialCard from "@/components/tutorial/TutorialCard";
import CodeBlock from "@/components/tutorial/CodeBlock";
import Breadcrumb from "@/components/ui/Breadcrumb";
import Badge from "@/components/ui/Badge";
import { DIFFICULTY_COLORS } from "@/lib/constants";
import { formatDate, formatNumber } from "@/lib/utils";
import {
  generateTutorialMetadata,
  tutorialArticleJsonLd,
  tutorialHowToJsonLd,
  breadcrumbJsonLd,
  jsonLdString,
} from "@/lib/seo";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const raw = await tutorialsApi.get(slug);
    // Map API snake_case → Tutorial type for generateTutorialMetadata
    const tutorial = {
      id:               raw.id,
      title:            raw.title,
      slug:             raw.slug,
      description:      raw.description ?? "",
      shortDescription: raw.short_description ?? "",
      difficulty:       raw.difficulty,
      estimatedTime:    raw.estimated_time ?? "",
      category:         raw.category ?? { id: "", name: "Tutorial", slug: "" },
      components:       raw.components ?? [],
      sensors:          raw.sensors ?? [],
      microcontrollers: raw.microcontrollers ?? [],
      wiringInstructions: raw.wiring_instructions ?? [],
      sourceCode:       raw.source_code ?? "",
      codeLanguage:     raw.code_language ?? "cpp",
      steps:            raw.steps ?? [],
      prerequisites:    raw.prerequisites ?? [],
      learningOutcomes: raw.learning_outcomes ?? [],
      relatedProductIds:  raw.related_product_ids ?? [],
      relatedTutorialIds: raw.related_tutorial_ids ?? [],
      coverImage:       raw.cover_image ?? "",
      views:            raw.views ?? 0,
      featured:         raw.featured ?? false,
      published:        raw.published ?? true,
      author:           raw.author ?? "IoTMart",
      tags:             raw.tags ?? [],
      createdAt:        raw.created_at ?? new Date().toISOString(),
      updatedAt:        raw.updated_at ?? new Date().toISOString(),
    };
    return generateTutorialMetadata(tutorial as any);
  } catch {
    return {};
  }
}

export default async function TutorialDetailPage({ params }: PageProps) {
  const { slug } = await params;

  let tutorial: any;
  try {
    tutorial = await tutorialsApi.get(slug);
  } catch {
    notFound();
  }

  // Fetch related tutorials and products in parallel
  const [relatedTutorialsData, relatedProductsData] = await Promise.all([
    (tutorial.related_tutorial_ids?.length
      ? tutorialsApi.list({ page_size: 3 }).then((r) =>
          r.items.filter(
            (t: any) =>
              tutorial.related_tutorial_ids.includes(t.id) && t.id !== tutorial.id
          ).slice(0, 3)
        )
      : Promise.resolve([])
    ).catch(() => []),

    (tutorial.related_product_ids?.length
      ? Promise.all(
          tutorial.related_product_ids.slice(0, 3).map((pid: string) =>
            productsApi.getById(pid).catch(() => null)
          )
        ).then((items) => items.filter(Boolean))
      : Promise.resolve([])
    ).catch(() => []),
  ]);

  const steps: any[]               = tutorial.steps ?? [];
  const wiringInstructions: any[]  = tutorial.wiring_instructions ?? [];
  const prerequisites: string[]    = tutorial.prerequisites ?? [];
  const learningOutcomes: string[] = tutorial.learning_outcomes ?? [];
  const components: string[]       = tutorial.components ?? [];
  const microcontrollers: string[] = tutorial.microcontrollers ?? [];

  // Build a Tutorial-like object for JSON-LD schemas
  const tutorialForSchema = {
    id:               tutorial.id,
    title:            tutorial.title,
    slug:             tutorial.slug,
    description:      tutorial.description ?? "",
    shortDescription: tutorial.short_description ?? "",
    difficulty:       tutorial.difficulty,
    estimatedTime:    tutorial.estimated_time ?? "",
    category:         tutorial.category ?? { id: "", name: "Tutorial", slug: "" },
    components,
    sensors:          tutorial.sensors ?? [],
    microcontrollers,
    wiringInstructions: [],
    sourceCode:       tutorial.source_code ?? "",
    codeLanguage:     tutorial.code_language ?? "cpp",
    steps:            steps.map((s: any, i: number) => ({
      stepNumber: s.step_number ?? s.stepNumber ?? i + 1,
      title:      s.title,
      content:    s.content,
      image:      s.image,
      code:       s.code,
      language:   s.language,
    })),
    prerequisites,
    learningOutcomes,
    relatedProductIds:  tutorial.related_product_ids ?? [],
    relatedTutorialIds: tutorial.related_tutorial_ids ?? [],
    coverImage:       tutorial.cover_image ?? "",
    views:            tutorial.views ?? 0,
    featured:         tutorial.featured ?? false,
    published:        tutorial.published ?? true,
    author:           tutorial.author ?? "IoTMart",
    tags:             tutorial.tags ?? [],
    createdAt:        tutorial.created_at ?? new Date().toISOString(),
    updatedAt:        tutorial.updated_at ?? new Date().toISOString(),
  };

  const articleSchema = tutorialArticleJsonLd(tutorialForSchema as any);
  const howToSchema   = tutorialHowToJsonLd(tutorialForSchema as any);
  const crumbSchema   = breadcrumbJsonLd([
    { label: "Tutorials", href: "/tutorials" },
    {
      label: tutorial.category?.name ?? "Tutorial",
      href: `/tutorials?category=${tutorial.category?.slug ?? ""}`,
    },
    { label: tutorial.title },
  ]);

  return (
    <>
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(howToSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(crumbSchema) }}
      />

      <div id="main-content" className="container-custom py-8">
        <Breadcrumb
          items={[
            { label: "Tutorials", href: "/tutorials" },
            {
              label: tutorial.category?.name ?? "Tutorial",
              href: `/tutorials?category=${tutorial.category?.slug ?? ""}`,
            },
            { label: tutorial.title },
          ]}
          className="mb-6"
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <article className="lg:col-span-2 space-y-8">
            {/* Hero image */}
            {tutorial.cover_image && (
              <div className="rounded-xl overflow-hidden">
                <div className="relative h-64 md:h-80">
                  <Image
                    src={tutorial.cover_image}
                    alt={tutorial.title}
                    fill
                    priority
                    className="object-cover"
                  />
                </div>
              </div>
            )}

            {/* Meta */}
            <div>
              <div className="flex flex-wrap gap-2 mb-3">
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                    DIFFICULTY_COLORS[tutorial.difficulty] ?? "bg-gray-100 text-gray-700"
                  }`}
                >
                  {tutorial.difficulty}
                </span>
                {tutorial.category && (
                  <Badge variant="outline">{tutorial.category.name}</Badge>
                )}
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-[#11100E] mb-3">
                {tutorial.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-[#899581]">
                {tutorial.author && (
                  <span className="flex items-center gap-1">
                    <User size={13} />
                    {tutorial.author}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock size={13} />
                  {tutorial.estimated_time}
                </span>
                <span className="flex items-center gap-1">
                  <Eye size={13} />
                  {formatNumber(tutorial.views ?? 0)} views
                </span>
                <time className="text-xs">{formatDate(tutorial.created_at)}</time>
              </div>
            </div>

            {/* Description */}
            {tutorial.description && (
              <section>
                <p className="text-[#899581] leading-relaxed">{tutorial.description}</p>
              </section>
            )}

            {/* Prerequisites */}
            {prerequisites.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-[#11100E] mb-3">Prerequisites</h2>
                <ul className="space-y-2">
                  {prerequisites.map((p: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[#899581]">
                      <CheckCircle size={15} className="text-[#A67D45] mt-0.5 flex-shrink-0" />
                      {p}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Wiring instructions */}
            {wiringInstructions.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-[#11100E] mb-3">Wiring Instructions</h2>
                <div className="overflow-x-auto rounded-xl border border-[#CDBBAD]/50">
                  <table className="w-full text-sm">
                    <thead className="bg-[#F0E9E3]">
                      <tr>
                        {["Component", "Pin", "MCU Pin", "Notes"].map((h) => (
                          <th
                            key={h}
                            className="px-4 py-2.5 text-left font-semibold text-[#11100E]"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {wiringInstructions.map((w: any, i: number) => (
                        <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-[#F0E9E3]/40"}>
                          <td className="px-4 py-2.5 font-medium text-[#11100E]">{w.component}</td>
                          <td className="px-4 py-2.5 font-mono text-[#5D1C34] text-xs">{w.pin}</td>
                          <td className="px-4 py-2.5 font-mono text-[#A67D45] text-xs">
                            {w.microcontroller_pin ?? w.microcontrollerPin}
                          </td>
                          <td className="px-4 py-2.5 text-[#899581] text-xs">
                            {w.description ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Steps */}
            {steps.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-[#11100E] mb-4">Step-by-Step Guide</h2>
                <div className="space-y-6">
                  {steps.map((step: any, i: number) => (
                    <div key={i} className="flex gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-[#5D1C34] text-white flex items-center justify-center text-sm font-bold">
                          {step.step_number ?? step.stepNumber ?? i + 1}
                        </div>
                      </div>
                      <div className="flex-1 pt-0.5">
                        <h3 className="font-semibold text-[#11100E] mb-2">{step.title}</h3>
                        <p className="text-sm text-[#899581] leading-relaxed">{step.content}</p>
                        {step.code && (
                          <div className="mt-3">
                            <CodeBlock code={step.code} language={step.language ?? "cpp"} />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Source code */}
            {tutorial.source_code && (
              <section>
                <h2 className="text-xl font-bold text-[#11100E] mb-3">Full Source Code</h2>
                <CodeBlock
                  code={tutorial.source_code}
                  language={tutorial.code_language ?? "cpp"}
                />
              </section>
            )}

            {/* Learning outcomes */}
            {learningOutcomes.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-[#11100E] mb-3">What You&apos;ll Learn</h2>
                <ul className="space-y-2">
                  {learningOutcomes.map((o: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[#899581]">
                      <CheckCircle size={15} className="text-green-500 mt-0.5 flex-shrink-0" />
                      {o}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </article>

          {/* Sidebar */}
          <aside className="space-y-6">
            {components.length > 0 && (
              <div className="bg-white rounded-xl border border-[#CDBBAD]/50 p-4">
                <h3 className="font-semibold text-[#11100E] mb-3">Components Needed</h3>
                <ul className="space-y-2">
                  {components.map((c: string, i: number) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-[#899581]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#A67D45] flex-shrink-0" />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {microcontrollers.length > 0 && (
              <div className="bg-white rounded-xl border border-[#CDBBAD]/50 p-4">
                <h3 className="font-semibold text-[#11100E] mb-3">Microcontrollers</h3>
                <div className="flex flex-wrap gap-2">
                  {microcontrollers.map((m: string) => (
                    <Badge key={m} variant="outline">{m}</Badge>
                  ))}
                </div>
              </div>
            )}

            {steps.length > 0 && (
              <div className="bg-white rounded-xl border border-[#CDBBAD]/50 p-4">
                <h3 className="font-semibold text-[#11100E] mb-3">Table of Contents</h3>
                <ol className="space-y-1.5">
                  {steps.map((step: any, i: number) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-[#899581]">
                      <span className="text-xs font-bold text-[#5D1C34] w-4">
                        {step.step_number ?? step.stepNumber ?? i + 1}.
                      </span>
                      {step.title}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {relatedProductsData.length > 0 && (
              <div>
                <h3 className="font-semibold text-[#11100E] mb-3">Shop Components</h3>
                <div className="space-y-3">
                  {relatedProductsData.map((product: any) => (
                    <Link
                      key={product.id}
                      href={`/products/${product.slug}`}
                      className="flex items-center gap-3 bg-white rounded-xl border border-[#CDBBAD]/50 p-3 hover:border-[#A67D45]/50 transition-colors group"
                    >
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-[#F0E9E3] flex-shrink-0">
                        {product.images?.[0] && (
                          <Image
                            src={product.images[0]}
                            alt={product.name}
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[#11100E] group-hover:text-[#5D1C34] line-clamp-2 transition-colors">
                          {product.name}
                        </p>
                        <p className="text-xs text-[#A67D45] font-semibold">
                          Rs. {Math.round(product.price).toLocaleString()}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>

        {/* Related tutorials */}
        {relatedTutorialsData.length > 0 && (
          <section className="mt-14">
            <h2 className="text-xl font-bold text-[#11100E] mb-5">Related Tutorials</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {relatedTutorialsData.map((tut: any) => (
                <TutorialCard key={tut.id} tutorial={tut} />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
