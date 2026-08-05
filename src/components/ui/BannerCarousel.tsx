"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface BannerData {
  id: string;
  title: string;
  subtitle: string;
  cta_text: string;
  cta_link: string;
  image: string;
}

export default function BannerCarousel({ banners }: { banners: BannerData[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % banners.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [banners.length]);

  if (banners.length === 0) return null;
  const current = banners[Math.min(index, banners.length - 1)];

  return (
    <section className="relative overflow-hidden bg-[#11100E]">
      {banners.map((b, i) => (
        <div
          key={b.id}
          aria-hidden={i !== index}
          className={`transition-opacity duration-700 ${i === index ? "opacity-100" : "opacity-0 pointer-events-none absolute inset-0"}`}
        >
          {b.image && (
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${b.image})` }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-br from-[#11100E]/85 via-[#5D1C34]/40 to-[#11100E]/70" />
        </div>
      ))}

      <div className="container-custom relative py-16 md:py-24">
        <div className="max-w-2xl">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">{current.title}</h2>
          {current.subtitle && (
            <p className="text-lg text-[#CDBBAD] leading-relaxed mb-8 max-w-xl">{current.subtitle}</p>
          )}
          {current.cta_text && current.cta_link && (
            <Link
              href={current.cta_link}
              className="inline-flex items-center gap-2 bg-[#5D1C34] hover:bg-[#4a1628] text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              {current.cta_text}
            </Link>
          )}
        </div>
      </div>

      {banners.length > 1 && (
        <div className="absolute bottom-5 inset-x-0 flex justify-center gap-2">
          {banners.map((b, i) => (
            <button
              key={b.id}
              onClick={() => setIndex(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`h-2 rounded-full transition-all ${i === index ? "w-6 bg-[#F0C060]" : "w-2 bg-white/40 hover:bg-white/70"}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
