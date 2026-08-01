import { cn } from "@/lib/utils";
import Button from "./Button";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  className?: string;
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-4 text-center",
        className
      )}
    >
      {icon && (
        <div className="mb-4 text-[#CDBBAD] [&>svg]:w-12 [&>svg]:h-12">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-[#11100E] mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-[#899581] max-w-sm mb-6">{description}</p>
      )}
      {action && (
        <Button
          variant="primary"
          onClick={action.onClick}
          {...(action.href && { as: "a", href: action.href })}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
