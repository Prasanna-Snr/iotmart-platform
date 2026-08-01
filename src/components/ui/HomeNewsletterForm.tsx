"use client";

import { useState } from "react";

export default function HomeNewsletterForm() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) setSubmitted(true);
  };

  if (submitted) {
    return (
      <p className="text-[#A67D45] font-medium text-sm">
        Thanks for subscribing! 🎉
      </p>
    );
  }

  return (
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
        className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white placeholder:text-[#899581] focus:outline-none focus:border-[#A67D45] text-sm"
      />
      <button
        type="submit"
        className="bg-[#A67D45] hover:bg-[#8f6b39] text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors flex-shrink-0"
      >
        Subscribe
      </button>
    </form>
  );
}
