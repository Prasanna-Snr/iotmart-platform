"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface CodeBlockProps {
  code: string;
  language?: string;
}

export default function CodeBlock({ code, language = "cpp" }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="relative rounded-xl overflow-hidden border border-white/10">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#1a1916]">
        <span className="text-xs font-medium text-[#899581] uppercase tracking-wide">
          {language}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-[#899581] hover:text-white transition-colors"
          aria-label="Copy code"
        >
          {copied ? (
            <>
              <Check size={13} className="text-green-400" />
              <span className="text-green-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy size={13} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code */}
      <pre className="overflow-x-auto p-4 bg-[#11100E] text-[#e5e7eb] text-sm leading-relaxed font-mono m-0">
        <code>{code}</code>
      </pre>
    </div>
  );
}
