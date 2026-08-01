"use client";

import Image from "next/image";
import { useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, ZoomIn, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductGalleryProps {
  images: string[];
  productName: string;
}

/** Pad/cycle the array to always have at least `count` entries */
function padImages(images: string[], count: number): string[] {
  if (images.length >= count) return images.slice(0, count);
  const result = [...images];
  while (result.length < count) {
    result.push(images[result.length % images.length]);
  }
  return result;
}

export default function ProductGallery({ images, productName }: ProductGalleryProps) {
  const galleryImages = padImages(images, 4);
  const [mainIdx, setMainIdx] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  const prev = useCallback(() => setMainIdx((i) => (i - 1 + galleryImages.length) % galleryImages.length), [galleryImages.length]);
  const next = useCallback(() => setMainIdx((i) => (i + 1) % galleryImages.length), [galleryImages.length]);

  return (
    <>
      <div className="flex flex-col gap-3">
        {/* Main image */}
        <div className="relative aspect-square rounded-xl overflow-hidden bg-[#F0E9E3] border border-[#CDBBAD]/50 group">
          <Image
            src={galleryImages[mainIdx]}
            alt={`${productName} — image ${mainIdx + 1}`}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />

          {/* Prev / Next arrows */}
          <button
            onClick={prev}
            aria-label="Previous image"
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm p-1.5 rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
          >
            <ChevronLeft size={18} className="text-[#11100E]" />
          </button>
          <button
            onClick={next}
            aria-label="Next image"
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm p-1.5 rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
          >
            <ChevronRight size={18} className="text-[#11100E]" />
          </button>

          {/* Zoom button */}
          <button
            onClick={() => setLightbox(true)}
            aria-label="Zoom image"
            className="absolute top-2 right-2 bg-white/80 backdrop-blur-sm p-1.5 rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
          >
            <ZoomIn size={16} className="text-[#11100E]" />
          </button>

          {/* Image counter */}
          <span className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
            {mainIdx + 1} / {galleryImages.length}
          </span>
        </div>

        {/* 4-image thumbnail grid */}
        <div className="grid grid-cols-4 gap-2">
          {galleryImages.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setMainIdx(idx)}
              aria-label={`View image ${idx + 1}`}
              className={cn(
                "relative aspect-square rounded-lg overflow-hidden border-2 transition-all duration-150",
                mainIdx === idx
                  ? "border-[#5D1C34] ring-1 ring-[#5D1C34]/30 scale-[0.97]"
                  : "border-[#CDBBAD]/50 hover:border-[#A67D45] hover:scale-[0.97]"
              )}
            >
              <Image
                src={img}
                alt={`${productName} thumbnail ${idx + 1}`}
                fill
                sizes="(max-width: 768px) 25vw, 12vw"
                className="object-cover"
              />
              {/* Active overlay */}
              {mainIdx === idx && (
                <div className="absolute inset-0 bg-[#5D1C34]/10" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Image lightbox"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightbox(false)}
        >
          <div
            className="relative w-full max-w-3xl aspect-square"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={galleryImages[mainIdx]}
              alt={`${productName} — full size ${mainIdx + 1}`}
              fill
              sizes="90vw"
              className="object-contain"
            />
            {/* Close */}
            <button
              onClick={() => setLightbox(false)}
              aria-label="Close lightbox"
              className="absolute top-2 right-2 bg-white/20 hover:bg-white/40 text-white p-2 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
            {/* Lightbox prev/next */}
            <button
              onClick={prev}
              aria-label="Previous image"
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white p-2 rounded-full transition-colors"
            >
              <ChevronLeft size={22} />
            </button>
            <button
              onClick={next}
              aria-label="Next image"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white p-2 rounded-full transition-colors"
            >
              <ChevronRight size={22} />
            </button>
            {/* Lightbox counter */}
            <span className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1 rounded-full">
              {mainIdx + 1} / {galleryImages.length}
            </span>
          </div>

          {/* Lightbox thumbnails */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {galleryImages.map((img, idx) => (
              <button
                key={idx}
                onClick={(e) => { e.stopPropagation(); setMainIdx(idx); }}
                aria-label={`View image ${idx + 1}`}
                className={cn(
                  "relative w-14 h-14 rounded-lg overflow-hidden border-2 transition-all",
                  mainIdx === idx ? "border-white scale-110" : "border-white/30 hover:border-white/70"
                )}
              >
                <Image src={img} alt="" fill sizes="56px" className="object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
