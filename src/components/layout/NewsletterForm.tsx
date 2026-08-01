"use client";

import { useState } from "react";

export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <p className="text-sm text-[#A67D45] font-medium">
        Thanks for subscribing! 🎉
      </p>
    );
  }

  return (
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
        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#899581] focus:outline-none focus:border-[#A67D45]"
      />
      <button
        type="submit"
        className="bg-[#5D1C34] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#4a1628] transition-colors flex-shrink-0"
      >
        Subscribe
      </button>
    </form>
  );
}
