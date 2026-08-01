"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { Block } from "@/lib/cms-store";
import type { SelectionInfo } from "@/components/admin/RichTextEditor";

const iCls = "w-full border border-[#CDBBAD] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5D1C34]/30 bg-white";
const sCls = "w-full border border-[#CDBBAD] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5D1C34]/30 bg-white";
const lCls = "block text-xs font-medium text-[#899581] mb-1";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><label className={lCls}>{label}</label>{children}</div>;
}

interface Props { block: Block; onChange: (b: Block) => void; selection?: SelectionInfo | null }

export default function BlockEditor({ block, onChange, selection }: Props) {
  const set = (patch: object) => onChange({ ...block, ...patch } as Block);

  switch (block.type) {

    // ── Paragraph ────────────────────────────────────────────────────────────
    case "paragraph":
      return (
        <div className="space-y-4">
          {/* Selected text info panel */}
          {selection && selection.text ? (
            <div className="rounded-xl border border-[#5D1C34]/30 bg-[#5D1C34]/5 p-3 space-y-2">
              <p className="text-xs font-semibold text-[#5D1C34] uppercase tracking-wide">Selected Text</p>
              <p className="text-sm text-[#11100E] font-medium line-clamp-3 bg-white rounded-lg px-3 py-2 border border-[#CDBBAD]/50">
                &ldquo;{selection.text}&rdquo;
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white rounded-lg px-2 py-1.5 border border-[#CDBBAD]/40">
                  <p className="text-[#899581]">Characters</p>
                  <p className="font-semibold text-[#11100E]">{selection.text.length}</p>
                </div>
                <div className="bg-white rounded-lg px-2 py-1.5 border border-[#CDBBAD]/40">
                  <p className="text-[#899581]">Words</p>
                  <p className="font-semibold text-[#11100E]">{selection.text.trim().split(/\s+/).filter(Boolean).length}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {selection.bold        && <span className="px-2 py-0.5 rounded-full bg-[#5D1C34] text-white text-[10px] font-bold">Bold</span>}
                {selection.italic      && <span className="px-2 py-0.5 rounded-full bg-[#A67D45] text-white text-[10px] italic">Italic</span>}
                {selection.underline   && <span className="px-2 py-0.5 rounded-full bg-[#899581] text-white text-[10px] underline">Underline</span>}
                {selection.strikeThrough && <span className="px-2 py-0.5 rounded-full bg-[#CDBBAD] text-[#11100E] text-[10px] line-through">Strike</span>}
                <span className="px-2 py-0.5 rounded-full bg-[#F0E9E3] text-[#899581] text-[10px] capitalize">{selection.align}</span>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-[#CDBBAD]/40 bg-[#F0E9E3]/50 px-3 py-3 text-center">
              <p className="text-xs text-[#899581]">Select text in the editor to see details here</p>
            </div>
          )}

          {/* Paragraph settings */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-[#899581] uppercase tracking-wide">Settings</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Alignment">
                <select className={sCls} value={block.align} onChange={(e) => set({ align: e.target.value })}>
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </Field>
              <Field label="Font Size">
                <select className={sCls} value={block.fontSize} onChange={(e) => set({ fontSize: e.target.value })}>
                  <option value="sm">Small</option>
                  <option value="base">Base</option>
                  <option value="lg">Large</option>
                  <option value="xl">X-Large</option>
                </select>
              </Field>
            </div>
          </div>
        </div>
      );

    // ── Heading ──────────────────────────────────────────────────────────────
    case "heading":
      return (
        <div className="space-y-3">
          <Field label="Text"><input className={iCls} value={block.text} onChange={(e) => set({ text: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Level">
              <select className={sCls} value={block.level} onChange={(e) => set({ level: e.target.value })}>
                <option value="h1">H1 — Page Title</option><option value="h2">H2 — Section</option>
                <option value="h3">H3 — Subsection</option><option value="h4">H4 — Minor</option>
              </select>
            </Field>
            <Field label="Alignment">
              <select className={sCls} value={block.align} onChange={(e) => set({ align: e.target.value })}>
                <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
              </select>
            </Field>
          </div>
        </div>
      );

    // ── List ─────────────────────────────────────────────────────────────────
    case "list":
      return (
        <div className="space-y-3">
          <Field label="List Style">
            <select className={sCls} value={block.style} onChange={(e) => set({ style: e.target.value })}>
              <option value="unordered">Unordered (bullets)</option><option value="ordered">Ordered (numbers)</option>
            </select>
          </Field>
          <div className="space-y-2">
            <label className={lCls}>Items</label>
            {block.items.map((item, i) => (
              <div key={i} className="flex gap-2">
                <input className={iCls} value={item} onChange={(e) => {
                  const items = [...block.items]; items[i] = e.target.value; set({ items });
                }} />
                <button onClick={() => set({ items: block.items.filter((_, j) => j !== i) })} disabled={block.items.length <= 1} className="text-red-400 hover:text-red-600 disabled:opacity-30 flex-shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button onClick={() => set({ items: [...block.items, "New item"] })} className="flex items-center gap-1 text-xs text-[#5D1C34] hover:underline">
              <Plus size={12} /> Add item
            </button>
          </div>
        </div>
      );

    // ── Table ────────────────────────────────────────────────────────────────
    case "table":
      return (
        <div className="space-y-4">
          <div>
            <label className={lCls}>Headers</label>
            <div className="flex gap-2 flex-wrap">
              {block.headers.map((h, i) => (
                <input key={i} className={`${iCls} w-28`} value={h} onChange={(e) => {
                  const headers = [...block.headers]; headers[i] = e.target.value; set({ headers });
                }} />
              ))}
              <button onClick={() => {
                const headers = [...block.headers, "Column"];
                const rows = block.rows.map((r) => [...r, ""]);
                set({ headers, rows });
              }} className="text-xs text-[#5D1C34] hover:underline flex items-center gap-1"><Plus size={12} />Col</button>
            </div>
          </div>
          <div>
            <label className={lCls}>Rows</label>
            <div className="space-y-1.5">
              {block.rows.map((row, ri) => (
                <div key={ri} className="flex gap-2 items-center">
                  {row.map((cell, ci) => (
                    <input key={ci} className={`${iCls} flex-1 min-w-0`} value={cell} onChange={(e) => {
                      const rows = block.rows.map((r, rj) => rj === ri ? r.map((c, cj) => cj === ci ? e.target.value : c) : r);
                      set({ rows });
                    }} />
                  ))}
                  <button onClick={() => set({ rows: block.rows.filter((_, j) => j !== ri) })} className="text-red-400 hover:text-red-600 flex-shrink-0"><Trash2 size={14} /></button>
                </div>
              ))}
              <button onClick={() => set({ rows: [...block.rows, new Array(block.headers.length).fill("")] })} className="flex items-center gap-1 text-xs text-[#5D1C34] hover:underline"><Plus size={12} />Add row</button>
            </div>
          </div>
        </div>
      );

    // ── Quote ────────────────────────────────────────────────────────────────
    case "quote":
      return (
        <div className="space-y-3">
          <Field label="Quote Text"><textarea className={iCls} rows={4} value={block.text} onChange={(e) => set({ text: e.target.value })} /></Field>
          <Field label="Attribution"><input className={iCls} value={block.author} onChange={(e) => set({ author: e.target.value })} placeholder="— Author name" /></Field>
          <Field label="Alignment">
            <select className={sCls} value={block.align} onChange={(e) => set({ align: e.target.value })}>
              <option value="left">Left (side bar)</option><option value="center">Center (top bar)</option>
            </select>
          </Field>
        </div>
      );

    // ── Code ─────────────────────────────────────────────────────────────────
    case "code":
      return (
        <div className="space-y-3">
          <Field label="Language">
            <select className={sCls} value={block.language} onChange={(e) => set({ language: e.target.value })}>
              {["javascript","typescript","python","cpp","c","html","css","bash","json","yaml"].map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </Field>
          <Field label="Code"><textarea className={`${iCls} font-mono text-xs`} rows={10} value={block.code} onChange={(e) => set({ code: e.target.value })} /></Field>
          <Field label="Caption"><input className={iCls} value={block.caption} onChange={(e) => set({ caption: e.target.value })} placeholder="Optional caption" /></Field>
        </div>
      );

    // ── Image ────────────────────────────────────────────────────────────────
    case "image":
      return (
        <div className="space-y-3">
          <Field label="Image URL"><input className={iCls} value={block.src} onChange={(e) => set({ src: e.target.value })} placeholder="https://..." /></Field>
          <Field label="Alt Text"><input className={iCls} value={block.alt} onChange={(e) => set({ alt: e.target.value })} /></Field>
          <Field label="Caption"><input className={iCls} value={block.caption} onChange={(e) => set({ caption: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Width">
              <select className={sCls} value={block.width} onChange={(e) => set({ width: e.target.value })}>
                <option value="full">Full</option><option value="large">Large</option><option value="medium">Medium</option><option value="small">Small</option>
              </select>
            </Field>
            <Field label="Alignment">
              <select className={sCls} value={block.align} onChange={(e) => set({ align: e.target.value })}>
                <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
              </select>
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={block.rounded} onChange={(e) => set({ rounded: e.target.checked })} className="accent-[#5D1C34]" />
            Rounded corners
          </label>
        </div>
      );

    // ── Cover ────────────────────────────────────────────────────────────────
    case "cover":
      return (
        <div className="space-y-3">
          <Field label="Background Image URL"><input className={iCls} value={block.src} onChange={(e) => set({ src: e.target.value })} placeholder="https://..." /></Field>
          <Field label="Heading"><input className={iCls} value={block.heading} onChange={(e) => set({ heading: e.target.value })} /></Field>
          <Field label="Subheading"><input className={iCls} value={block.subheading} onChange={(e) => set({ subheading: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Height">
              <select className={sCls} value={block.height} onChange={(e) => set({ height: e.target.value })}>
                <option value="sm">Small</option><option value="md">Medium</option><option value="lg">Large</option><option value="full">Full Screen</option>
              </select>
            </Field>
            <Field label="Text Color">
              <input type="color" className="h-9 w-full rounded-lg border border-[#CDBBAD] px-1 cursor-pointer" value={block.textColor} onChange={(e) => set({ textColor: e.target.value })} />
            </Field>
          </div>
          <Field label={`Overlay Opacity: ${block.overlay}%`}>
            <input type="range" min={0} max={90} value={block.overlay} onChange={(e) => set({ overlay: Number(e.target.value) })} className="w-full accent-[#5D1C34]" />
          </Field>
        </div>
      );

    // ── Audio ────────────────────────────────────────────────────────────────
    case "audio":
      return (
        <div className="space-y-3">
          <Field label="Audio URL"><input className={iCls} value={block.src} onChange={(e) => set({ src: e.target.value })} placeholder="https://example.com/audio.mp3" /></Field>
          <Field label="Title"><input className={iCls} value={block.title} onChange={(e) => set({ title: e.target.value })} /></Field>
          <Field label="Caption"><input className={iCls} value={block.caption} onChange={(e) => set({ caption: e.target.value })} /></Field>
        </div>
      );

    // ── Video ────────────────────────────────────────────────────────────────
    case "video":
      return (
        <div className="space-y-3">
          <Field label="Video URL or Embed URL"><input className={iCls} value={block.src} onChange={(e) => set({ src: e.target.value })} placeholder="https://youtube.com/embed/..." /></Field>
          <Field label="Title"><input className={iCls} value={block.title} onChange={(e) => set({ title: e.target.value })} /></Field>
          <Field label="Caption"><input className={iCls} value={block.caption} onChange={(e) => set({ caption: e.target.value })} /></Field>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={block.autoplay} onChange={(e) => set({ autoplay: e.target.checked })} className="accent-[#5D1C34]" />
            Autoplay
          </label>
        </div>
      );

    // ── Button ───────────────────────────────────────────────────────────────
    case "button":
      return (
        <div className="space-y-3">
          <Field label="Button Text"><input className={iCls} value={block.text} onChange={(e) => set({ text: e.target.value })} /></Field>
          <Field label="Link URL"><input className={iCls} value={block.link} onChange={(e) => set({ link: e.target.value })} placeholder="/page or https://..." /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Style">
              <select className={sCls} value={block.variant} onChange={(e) => set({ variant: e.target.value })}>
                <option value="primary">Primary</option><option value="secondary">Secondary</option>
                <option value="outline">Outline</option><option value="ghost">Ghost</option>
              </select>
            </Field>
            <Field label="Size">
              <select className={sCls} value={block.size} onChange={(e) => set({ size: e.target.value })}>
                <option value="sm">Small</option><option value="md">Medium</option><option value="lg">Large</option>
              </select>
            </Field>
          </div>
          <Field label="Alignment">
            <select className={sCls} value={block.align} onChange={(e) => set({ align: e.target.value })}>
              <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
            </select>
          </Field>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={block.openNewTab} onChange={(e) => set({ openNewTab: e.target.checked })} className="accent-[#5D1C34]" />
            Open in new tab
          </label>
        </div>
      );

    case "row":
    case "column":
      return <p className="text-xs text-[#899581]">Select a child block to edit it.</p>;

    default:
      return <p className="text-xs text-[#899581]">No editor available.</p>;
  }
}
