import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "block" | "circle";
}

export default function Skeleton({
  className,
  variant = "block",
}: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-pulse bg-[#CDBBAD]/40",
        variant === "circle" && "rounded-full",
        variant === "text" && "rounded h-4",
        variant === "block" && "rounded-lg",
        className
      )}
    />
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-[#CDBBAD]/50 overflow-hidden">
      <Skeleton className="h-52 rounded-none" />
      <div className="p-4 space-y-3">
        <Skeleton variant="text" className="w-1/3 h-3" />
        <Skeleton variant="text" className="w-3/4 h-5" />
        <Skeleton variant="text" className="w-1/2 h-3" />
        <div className="flex gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="w-4 h-4 rounded" />
          ))}
        </div>
        <div className="flex items-center justify-between pt-1">
          <Skeleton variant="text" className="w-16 h-6" />
          <Skeleton className="w-24 h-8 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function TutorialCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-[#CDBBAD]/50 overflow-hidden">
      <Skeleton className="h-48 rounded-none" />
      <div className="p-4 space-y-3">
        <div className="flex gap-2">
          <Skeleton className="w-16 h-5 rounded-full" />
          <Skeleton className="w-20 h-5 rounded-full" />
        </div>
        <Skeleton variant="text" className="w-full h-5" />
        <Skeleton variant="text" className="w-4/5 h-5" />
        <Skeleton variant="text" className="w-2/3 h-3" />
      </div>
    </div>
  );
}
