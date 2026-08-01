import { cn } from "@/lib/utils";
import { type InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, leftIcon, rightIcon, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-[#11100E] mb-1.5"
          >
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-[#899581]">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-[#11100E]",
              "placeholder:text-[#899581] transition-colors duration-150",
              "focus:outline-none focus:ring-2 focus:ring-[#5D1C34] focus:border-[#5D1C34]",
              "disabled:bg-[#F0E9E3] disabled:cursor-not-allowed disabled:opacity-60",
              error
                ? "border-red-400 focus:ring-red-400 focus:border-red-400"
                : "border-[#CDBBAD] hover:border-[#A67D45]",
              leftIcon && "pl-10",
              rightIcon && "pr-10",
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-[#899581]">
              {rightIcon}
            </div>
          )}
        </div>
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

Input.displayName = "Input";
export default Input;
