"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, Home, RefreshCw } from "lucide-react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service in production
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#F0E9E3] flex flex-col items-center justify-center px-4">
      {/* Decorative background */}
      <div
        aria-hidden="true"
        className="absolute inset-0 overflow-hidden pointer-events-none"
      >
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#5D1C34]/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-lg w-full text-center space-y-6">
        {/* Error icon */}
        <div className="flex justify-center">
          <div className="p-4 rounded-full bg-[#5D1C34]/10">
            <AlertCircle
              size={40}
              className="text-[#5D1C34]"
              aria-hidden="true"
            />
          </div>
        </div>

        {/* Error message */}
        <div>
          <h1 className="text-2xl font-bold text-[#11100E] mb-2">
            Something went wrong
          </h1>
          <p className="text-[#899581] text-sm leading-relaxed">
            We encountered an unexpected error. This has been logged and
            we&apos;re working on a fix.
          </p>

          {/* Error details (shown only in development) */}
          {process.env.NODE_ENV === "development" && error.message && (
            <details className="mt-4 text-left">
              <summary className="cursor-pointer text-xs text-[#A67D45] font-medium hover:text-[#5D1C34] transition-colors">
                Error details (dev only)
              </summary>
              <div className="mt-2 p-3 rounded-lg bg-[#11100E] text-[#F0E9E3] text-xs font-mono overflow-auto max-h-32">
                <p className="text-red-400">{error.message}</p>
                {error.digest && (
                  <p className="text-[#899581] mt-1">Digest: {error.digest}</p>
                )}
              </div>
            </details>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap justify-center gap-3">
          <button
            onClick={reset}
            className={
              "inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold " +
              "bg-[#5D1C34] text-white hover:bg-[#4a1628] " +
              "focus:outline-none focus:ring-2 focus:ring-[#5D1C34]/30 transition-colors"
            }
          >
            <RefreshCw size={15} aria-hidden="true" />
            Try again
          </button>
          <Link
            href="/"
            className={
              "inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold " +
              "bg-white border border-[#CDBBAD] text-[#11100E] " +
              "hover:border-[#A67D45] hover:text-[#5D1C34] " +
              "focus:outline-none focus:ring-2 focus:ring-[#5D1C34]/10 transition-colors"
            }
          >
            <Home size={15} aria-hidden="true" />
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
