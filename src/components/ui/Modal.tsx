"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  className,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen) {
      dialog.showModal();
      document.body.style.overflow = "hidden";
    } else {
      dialog.close();
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      className={cn(
        "w-full rounded-xl shadow-2xl border border-[#CDBBAD]/50 p-0 m-auto",
        "backdrop:bg-black/50 backdrop:backdrop-blur-sm",
        "open:animate-fade-in",
        sizeClasses[size],
        className
      )}
    >
      <div className="bg-white rounded-xl overflow-hidden">
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#F0E9E3]">
            <h2 className="text-lg font-semibold text-[#11100E]">{title}</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#899581] hover:text-[#5D1C34] hover:bg-[#F0E9E3] transition-colors"
              aria-label="Close dialog"
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </dialog>
  );
}
