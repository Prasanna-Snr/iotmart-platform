import { cn } from "@/lib/utils";
import { forwardRef, TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const fieldId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={fieldId}
            className="block text-sm font-medium text-[#11100E] mb-1.5"
          >
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={fieldId}
          className={cn(
            "w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-[#11100E]",
            "placeholder:text-[#899581] transition-colors duration-150 resize-y",
            "focus:outline-none focus:ring-2 focus:ring-[#5D1C34] focus:border-[#5D1C34]",
            "disabled:bg-[#F0E9E3] disabled:cursor-not-allowed min-h-[100px]",
            error
              ? "border-red-400 focus:ring-red-400"
              : "border-[#CDBBAD] hover:border-[#A67D45]",
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-xs text-red-600" role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p className="mt-1.5 text-xs text-[#899581]">{hint}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
export default Textarea;
