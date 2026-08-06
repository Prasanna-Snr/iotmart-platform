"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  cta_text?: string;
  cta_link?: string;
  image?: string;
}

interface Props {
  banners: Banner[];
}

export default function BannerCarousel({ banners }: Props) {
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => setCurrent(c => (c + 1) % banners.length), [banners.length]);
  const prev = () => setCurrent(c => (c - 1 + banners.length) % banners.length);

  // Auto-advance every 5 seconds
  useEffect(() => {
    if (banners.length <= 1) return;
    const id = setInterval(next, 5000);
    return () => clearInterval(id);
  }, [banners.length, next]);

  if (!banners.length) return null;

  const banner = banners[current];

  return (
    <section aria-label="Promotional banners" className="relative overflow-hidden bg-[#11100E]">
      <div className="relative h-48 md:h-64 lg:h-80">
        {banner.image ? (
          <Image
            src={banner.image}
            alt={banner.title}
            fill
            className="object-cover opacity-60"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-[#5D1C34] to-[#A67D45]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-[#11100E]/70 to-transparent" />

        <div className="absolute inset-0 flex items-center">
          <div className="container-custom">
            <div className="max-w-lg">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">{banner.title}</h2>
              {banner.subtitle && (
                <p className="text-[#CDBBAD] text-sm md:text-base mb-4">{banner.subtitle}</p>
              )}
              {banner.cta_text && banner.cta_link && (
                <Link
                  href={banner.cta_link}
                  className="inline-block bg-[#5D1C34] hover:bg-[#4a1628] text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
                >
                  {banner.cta_text}
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation arrows — only shown if more than one banner */}
      {banners.length > 1 && (
        <>
          <button
            onClick={prev}
            aria-label="Previous banner"
            className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={next}
            aria-label="Next banner"
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full transition-colors"
          >
            <ChevronRight size={18} />
          </button>

          {/* Dot indicators */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                aria-label={`Go to banner ${i + 1}`}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === current ? "bg-white" : "bg-white/40"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
