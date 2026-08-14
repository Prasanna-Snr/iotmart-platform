import Image from "next/image";
import Link from "next/link";
import { Clock, Eye, ChevronRight } from "lucide-react";
import { DIFFICULTY_COLORS } from "@/lib/constants";
import { formatNumber } from "@/lib/utils";
import Badge from "@/components/ui/Badge";
import type { Tutorial as ApiTutorial } from "@/lib/api";
import type { Tutorial as UiTutorial } from "@/types";

/** Shared minimal shape of the fields TutorialCard reads. API data arrives
 *  snake_case, static data uses camelCase — both are accepted. */
interface TutorialCardSource {
  slug: string;
  title: string;
  difficulty?: string;
  views?: number;
  cover_image?: string;
  coverImage?: string;
  estimated_time?: string;
  estimatedTime?: string;
  short_description?: string;
  shortDescription?: string;
  category?: { name?: string } | null;
}

type TutorialCardInput = ApiTutorial | UiTutorial;

interface TutorialCardProps {
  tutorial: TutorialCardInput;
  compact?: boolean;
}

export default function TutorialCard({
  tutorial: raw,
  compact = false,
}: TutorialCardProps) {
  // Support both API snake_case and legacy camelCase shapes
  const tutorial: TutorialCardSource = raw;
  const coverImage      = tutorial.cover_image      ?? tutorial.coverImage      ?? "";
  const estimatedTime   = tutorial.estimated_time   ?? tutorial.estimatedTime   ?? "";
  const shortDescription= tutorial.short_description?? tutorial.shortDescription?? "";
  const categoryName    = tutorial.category?.name   ?? "";

  return (
    <article className="group bg-white rounded-xl border border-[#CDBBAD]/50 overflow-hidden shadow-sm hover:shadow-md hover:border-[#A67D45]/40 transition-all duration-200">
      <Link
        href={`/tutorials/${tutorial.slug}`}
        className="block relative"
        aria-label={tutorial.title}
      >
        <div className={`relative overflow-hidden bg-[#F0E9E3] ${compact ? "h-40" : "h-48"}`}>
          {coverImage ? (
            <Image
              src={coverImage}
              alt={tutorial.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[#CDBBAD] text-sm">
              No Image
            </div>
          )}
          <div className="absolute top-2 left-2">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${DIFFICULTY_COLORS[tutorial.difficulty ?? ""] ?? "bg-gray-100 text-gray-600"}`}>
              {tutorial.difficulty}
            </span>
          </div>
        </div>
      </Link>

      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          {categoryName && (
            <Badge variant="outline" size="sm">{categoryName}</Badge>
          )}
          {estimatedTime && (
            <div className="flex items-center gap-1 text-xs text-[#899581]">
              <Clock size={11} />
              {estimatedTime}
            </div>
          )}
        </div>

        <Link href={`/tutorials/${tutorial.slug}`}>
          <h3 className="text-sm font-semibold text-[#11100E] line-clamp-2 hover:text-[#5D1C34] transition-colors mb-2">
            {tutorial.title}
          </h3>
        </Link>

        {!compact && shortDescription && (
          <p className="text-xs text-[#899581] line-clamp-2 mb-3">
            {shortDescription}
          </p>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-[#899581]">
            <Eye size={11} />
            {formatNumber(tutorial.views ?? 0)} views
          </div>
          <Link
            href={`/tutorials/${tutorial.slug}`}
            className="flex items-center gap-1 text-xs font-medium text-[#5D1C34] hover:underline"
          >
            Read <ChevronRight size={13} />
          </Link>
        </div>
      </div>
    </article>
  );
}
