"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: number;
  interactive?: boolean;
  onChange?: (rating: number) => void;
  className?: string;
  showValue?: boolean;
}

export default function StarRating({
  rating,
  maxRating = 5,
  size = 16,
  interactive = false,
  onChange,
  className,
  showValue = false,
}: StarRatingProps) {
  const [hovered, setHovered] = useState(0);

  const effectiveRating = interactive && hovered ? hovered : rating;

  return (
    <div
      className={cn("inline-flex items-center gap-0.5", className)}
      role={interactive ? "group" : undefined}
      aria-label={`Rating: ${rating} out of ${maxRating} stars`}
    >
      {Array.from({ length: maxRating }, (_, i) => {
        const starValue = i + 1;
        const filled = starValue <= Math.floor(effectiveRating);
        const halfFilled =
          !filled && starValue === Math.ceil(effectiveRating) && effectiveRating % 1 >= 0.5;

        return (
          <button
            key={i}
            type="button"
            disabled={!interactive}
            aria-label={`${starValue} star${starValue > 1 ? "s" : ""}`}
            onClick={() => interactive && onChange?.(starValue)}
            onMouseEnter={() => interactive && setHovered(starValue)}
            onMouseLeave={() => interactive && setHovered(0)}
            className={cn(
              "focus:outline-none",
              interactive && "cursor-pointer hover:scale-110 transition-transform"
            )}
          >
            <Star
              size={size}
              className={cn(
                "transition-colors",
                filled
                  ? "fill-[#A67D45] text-[#A67D45]"
                  : halfFilled
                  ? "fill-[#A67D45]/50 text-[#A67D45]"
                  : "fill-transparent text-[#CDBBAD]"
              )}
            />
          </button>
        );
      })}
      {showValue && (
        <span className="ml-1 text-sm font-medium text-[#A67D45]">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}
