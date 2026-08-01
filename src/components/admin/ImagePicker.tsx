"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Upload, Link as LinkIcon, X, GripVertical, ImageIcon } from "lucide-react";
import { uploadApi } from "@/lib/api";
import { getAdminToken } from "@/lib/adminAuth";

interface ImagePickerProps {
  images: string[];
  onChange: (images: string[]) => void;
}

type Tab = "upload" | "url";

export default function ImagePicker({ images, onChange }: ImagePickerProps) {
  const [tab, setTab] = useState<Tab>("upload");
  const [urlInput, setUrlInput] = useState("");
  const [urlError, setUrlError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Local file upload ──────────────────────────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const token = getAdminToken();
    if (!token) { setUploadError("Not authenticated."); return; }

    setUploading(true);
    setUploadError("");
    try {
      const urls = await Promise.all(
        files.map((file) => uploadApi.upload(file, token).then((r) => r.url))
      );
      onChange([...images, ...urls]);
    } catch (err: any) {
      setUploadError(err.message ?? "Upload failed.");
    } finally {
      setUploading(false);
      // Reset input so the same file can be re-selected if needed
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ─── URL add ────────────────────────────────────────────────────────────────
  const handleAddUrl = () => {
    const url = urlInput.trim();
    if (!url) { setUrlError("Enter a URL."); return; }
    try {
      new URL(url); // validate
    } catch {
      setUrlError("Enter a valid URL (e.g. https://…)");
      return;
    }
    if (images.includes(url)) { setUrlError("This URL is already added."); return; }
    onChange([...images, url]);
    setUrlInput("");
    setUrlError("");
  };

  // ─── Remove / reorder ───────────────────────────────────────────────────────
  const removeImage = (idx: number) =>
    onChange(images.filter((_, i) => i !== idx));

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    const next = [...images];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    onChange(next);
  };

  const moveDown = (idx: number) => {
    if (idx === images.length - 1) return;
    const next = [...images];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    onChange(next);
  };

  return (
    <div className="space-y-4">
      {/* Tab switcher */}
      <div className="flex gap-1 bg-[#F0E9E3] rounded-lg p-1 w-fit">
        {(["upload", "url"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              tab === t
                ? "bg-white text-[#11100E] shadow-sm"
                : "text-[#899581] hover:text-[#11100E]"
            }`}
          >
            {t === "upload" ? <Upload size={12} /> : <LinkIcon size={12} />}
            {t === "upload" ? "Upload File" : "From URL"}
          </button>
        ))}
      </div>

      {/* Upload panel */}
      {tab === "upload" && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="sr-only"
            id="image-file-input"
            onChange={handleFileChange}
            disabled={uploading}
          />
          <label
            htmlFor="image-file-input"
            className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-6 cursor-pointer transition-colors ${
              uploading
                ? "border-[#CDBBAD] bg-[#F0E9E3]/50 cursor-not-allowed"
                : "border-[#CDBBAD] hover:border-[#5D1C34] hover:bg-[#F0E9E3]/60"
            }`}
          >
            <Upload size={20} className={uploading ? "text-[#CDBBAD] animate-bounce" : "text-[#899581]"} />
            <p className="text-sm text-[#899581]">
              {uploading ? "Uploading…" : "Click to select images"}
            </p>
            <p className="text-xs text-[#CDBBAD]">JPEG, PNG, WebP, GIF · max 5 MB each</p>
          </label>
          {uploadError && (
            <p className="mt-1.5 text-xs text-red-500">{uploadError}</p>
          )}
        </div>
      )}

      {/* URL panel */}
      {tab === "url" && (
        <div>
          <div className="flex gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => { setUrlInput(e.target.value); setUrlError(""); }}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddUrl())}
              placeholder="https://example.com/image.jpg"
              className="flex-1 border border-[#CDBBAD] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5D1C34]/30"
            />
            <button
              type="button"
              onClick={handleAddUrl}
              className="bg-[#5D1C34] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#4a1628] transition-colors"
            >
              Add
            </button>
          </div>
          {urlError && (
            <p className="mt-1.5 text-xs text-red-500">{urlError}</p>
          )}
        </div>
      )}

      {/* Image list */}
      {images.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-[#899581]">
            {images.length} image{images.length !== 1 ? "s" : ""} · first is cover
          </p>
          <div className="space-y-2">
            {images.map((src, idx) => (
              <div
                key={src + idx}
                className="flex items-center gap-3 bg-[#F0E9E3]/60 border border-[#CDBBAD]/40 rounded-lg p-2"
              >
                {/* Drag hint */}
                <div className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={() => moveUp(idx)}
                    disabled={idx === 0}
                    className="text-[#CDBBAD] hover:text-[#899581] disabled:opacity-20 leading-none"
                    aria-label="Move up"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => moveDown(idx)}
                    disabled={idx === images.length - 1}
                    className="text-[#CDBBAD] hover:text-[#899581] disabled:opacity-20 leading-none"
                    aria-label="Move down"
                  >
                    ▼
                  </button>
                </div>

                {/* Thumbnail */}
                <div className="relative w-12 h-12 rounded-md overflow-hidden bg-white flex-shrink-0">
                  {src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={src}
                      alt={`Image ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#CDBBAD]">
                      <ImageIcon size={16} />
                    </div>
                  )}
                  {idx === 0 && (
                    <span className="absolute bottom-0 left-0 right-0 text-center text-white text-[9px] font-bold bg-[#5D1C34]/70 leading-4">
                      COVER
                    </span>
                  )}
                </div>

                {/* URL */}
                <p className="flex-1 text-xs text-[#899581] truncate min-w-0">{src}</p>

                {/* Remove */}
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="flex-shrink-0 p-1 rounded text-[#899581] hover:text-red-500 hover:bg-red-50 transition-colors"
                  aria-label={`Remove image ${idx + 1}`}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
