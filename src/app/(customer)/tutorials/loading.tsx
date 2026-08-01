import { TutorialCardSkeleton } from "@/components/ui/Skeleton";

export default function TutorialsLoading() {
  return (
    <div
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
      aria-label="Loading tutorials"
      role="status"
    >
      {/* Page header skeleton */}
      <div className="mb-6 space-y-2">
        <div className="h-8 w-44 bg-[#CDBBAD]/40 rounded-lg animate-pulse" />
        <div className="h-4 w-80 bg-[#CDBBAD]/30 rounded animate-pulse" />
      </div>

      {/* Filter bar skeleton */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="h-9 w-28 bg-[#CDBBAD]/40 rounded-lg animate-pulse" />
        <div className="h-9 w-32 bg-[#CDBBAD]/40 rounded-lg animate-pulse" />
        <div className="h-9 w-24 bg-[#CDBBAD]/40 rounded-lg animate-pulse" />
        <div className="ml-auto h-9 w-44 bg-[#CDBBAD]/40 rounded-lg animate-pulse" />
      </div>

      {/* Tutorial grid skeleton — 9 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 9 }).map((_, i) => (
          <TutorialCardSkeleton key={i} />
        ))}
      </div>

      {/* Pagination skeleton */}
      <div className="mt-8 flex justify-center gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-9 w-9 rounded-lg bg-[#CDBBAD]/40 animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}
