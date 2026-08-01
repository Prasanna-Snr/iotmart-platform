import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

const paddingClasses = {
  none: "",
  sm: "p-3",
  md: "p-4 md:p-6",
  lg: "p-6 md:p-8",
};

export default function Card({
  children,
  className,
  hover = false,
  padding = "md",
}: CardProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-xl border border-[#CDBBAD]/50 shadow-sm",
        hover && "transition-shadow hover:shadow-md hover:border-[#A67D45]/40",
        paddingClasses[padding],
        className
      )}
    >
      {children}
    </div>
  );
}
