"use client";

import { useState } from "react";
import { newsletterApi } from "@/lib/api";

type Status = "idle" | "submitting" | "success" | "error";

export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("submitting");
    try {
      await newsletterApi.subscribe(email.trim());
      setStatus("success");
    } catch {
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <p className="text-sm text-[#A67D45] font-medium">
        Thanks for subscribing! Check your inbox for updates.
      </p>
    );
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <label htmlFor="newsletter-email" className="sr-only">
          Email address
        </label>
        <input
          id="newsletter-email"
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={status === "submitting"}
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#899581] focus:outline-none focus:border-[#A67D45]"
        />
        <button
          type="submit"
          disabled={status === "submitting"}
          className="bg-[#5D1C34] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#4a1628] transition-colors flex-shrink-0 disabled:opacity-60"
        >
          {status === "submitting" ? "Subscribing…" : "Subscribe"}
        </button>
      </form>
      {status === "error" && (
        <p className="text-xs text-red-400 mt-2">
          Something went wrong. Please try again.
        </p>
      )}
    </div>
  );
}
