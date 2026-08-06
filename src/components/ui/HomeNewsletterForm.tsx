"use client";

import { useState } from "react";
import { newsletterApi } from "@/lib/api";

type Status = "idle" | "submitting" | "success" | "error";

export default function HomeNewsletterForm() {
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
      <p className="text-[#A67D45] font-medium text-sm">
        Thanks for subscribing! Check your inbox for updates.
      </p>
    );
  }

  return (
    <div>
      <form
        onSubmit={handleSubmit}
        className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
      >
        <label htmlFor="home-newsletter-email" className="sr-only">
          Email address
        </label>
        <input
          id="home-newsletter-email"
          type="email"
          placeholder="Your email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={status === "submitting"}
          className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white placeholder:text-[#899581] focus:outline-none focus:border-[#A67D45] text-sm"
        />
        <button
          type="submit"
          disabled={status === "submitting"}
          className="bg-[#A67D45] hover:bg-[#8f6b39] text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors flex-shrink-0 disabled:opacity-60"
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
