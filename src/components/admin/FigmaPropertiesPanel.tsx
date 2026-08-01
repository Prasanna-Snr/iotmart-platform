"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2, ChevronUp, GripVertical } from "lucide-react";
import type { Block, BlockType, RowBlock, ColumnBlock } from "@/lib/cms-store";
import { BLOCK_META, BLOCK_DEFAULTS } from "@/lib/cms-store";
import type { SelectionInfo } from "@/components/admin/RichTextEditor";

interface Props {
  block: Block;
  onChange: (b: Block) => void;
  selection?: SelectionInfo | null;
  onDelete: () => void;
}

// ── Reusable field components ─────────────────────────────────────────────────
const iCls = "w-full border border-[#CDBBAD] rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#5D1C34]/30 bg-white text-[#11100E]";
const sCls = "w-full border border-[#CDBBAD] rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#5D1C34]/30 bg-white text-[#11100E]";

function PropRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="text-[10px] text-[#899581] w-20 flex-shrink-0">{label}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-[#F0E9E3]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-[#F0E9E3]/50 transition-colors"
      >
        <span className="text-[10px] font-bold text-[#899581] uppercase tracking-widest">{title}</span>
        {open ? <ChevronDown size={11} className="text-[#CDBBAD]" /> : <ChevronRight size={11} className="text-[#CDBBAD]" />}
      </button>
      {open && <div className="px-3 pb-3 space-y-0.5">{children}</div>}
    </div>
  );
}

function AlignButtons({ value, onChange, options }: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; icon: React.ReactNode }[];
}) {
  return (
    <div className="flex gap-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`flex-1 h-6 flex items-center justify-center rounded border text-[#899581] transition-colors ${value === o.value ? "bg-[#5D1C34] text-white border-[#5D1C34]" : "border-[#CDBBAD] hover:border-[#5D1C34]"}`}
        >
          {o.icon}
        </button>
      ))}
    </div>
  );
}

const alignIcons = [
  { value: "left",   icon: <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="4" width="18" height="2"/><rect x="3" y="9" width="12" height="2"/><rect x="3" y="14" width="18" height="2"/><rect x="3" y="19" width="12" height="2"/></svg> },
  { value: "center", icon: <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="4" width="18" height="2"/><rect x="6" y="9" width="12" height="2"/><rect x="3" y="14" width="18" height="2"/><rect x="6" y="19" width="12" height="2"/></svg> },
  { value: "right",  icon: <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="4" width="18" height="2"/><rect x="9" y="9" width="12" height="2"/><rect x="3" y="14" width="18" height="2"/><rect x="9" y="19" width="12" height="2"/></svg> },
];

// ── Main panel ────────────────────────────────────────────────────────────────
export default function FigmaPropertiesPanel({ block, onChange, selection, onDelete }: Props) {
  const set = (patch: object) => onChange({ ...block, ...patch } as Block);
  const meta = BLOCK_META[block.type];

  return (
    <div className="h-full flex flex-col bg-white border-l border-[#CDBBAD]/50 w-64 flex-shrink-0">
      {/* Header */}
      <div className="px-3 py-3 border-b border-[#CDBBAD]/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-[#5D1C34]/10 flex items-center justify-center text-[10px] font-bold text-[#5D1C34]">{meta.icon}</span>
          <span className="text-xs font-bold text-[#11100E]">{meta.label}</span>
        </div>
        <span className="text-[9px] text-[#CDBBAD] font-mono">{block.id.slice(0, 6)}</span>
      </div>

      {/* Scrollable props */}
      <div className="flex-1 overflow-y-auto">

        {/* ── Paragraph ── */}
        {block.type === "paragraph" && (
          <>
            {/* Selected text */}
            {selection?.text ? (
              <Section title="Selection">
                <div className="bg-[#5D1C34]/5 rounded-lg p-2 mb-1">
                  <p className="text-[10px] text-[#11100E] italic line-clamp-2">&ldquo;{selection.text}&rdquo;</p>
                  <div className="flex gap-3 mt-1.5 text-[9px] text-[#899581]">
                    <span>{selection.text.length} chars</span>
                    <span>{selection.text.trim().split(/\s+/).filter(Boolean).length} words</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {selection.bold        && <span className="px-1.5 py-0.5 bg-[#5D1C34] text-white rounded text-[9px] font-bold">B</span>}
                    {selection.italic      && <span className="px-1.5 py-0.5 bg-[#A67D45] text-white rounded text-[9px] italic">I</span>}
                    {selection.underline   && <span className="px-1.5 py-0.5 bg-[#899581] text-white rounded text-[9px] underline">U</span>}
                    {selection.strikeThrough && <span className="px-1.5 py-0.5 bg-[#CDBBAD] text-[#11100E] rounded text-[9px] line-through">S</span>}
                    <span className="px-1.5 py-0.5 bg-[#F0E9E3] text-[#899581] rounded text-[9px] capitalize">{selection.align}</span>
                  </div>
                </div>
              </Section>
            ) : (
              <Section title="Selection">
                <p className="text-[10px] text-[#CDBBAD] text-center py-2">Select text to inspect</p>
              </Section>
            )}
            <Section title="Typography">
              <PropRow label="Size">
                <select className={sCls} value={(block as { fontSize: string }).fontSize} onChange={(e) => set({ fontSize: e.target.value })}>
                  <option value="sm">Small — 14px</option>
                  <option value="base">Base — 16px</option>
                  <option value="lg">Large — 18px</option>
                  <option value="xl">X-Large — 20px</option>
                </select>
              </PropRow>
              <PropRow label="Align">
                <AlignButtons value={(block as { align: string }).align} onChange={(v) => set({ align: v })} options={alignIcons} />
              </PropRow>
            </Section>
            <Section title="Dimensions">
              <PropRow label="Width">
                <select className={sCls} value={(block as { width: string }).width} onChange={(e) => set({ width: e.target.value })}>
                  <option value="auto">Auto</option>
                  <option value="full">Full (100%)</option>
                  <option value="fit">Fit content</option>
                  <option value="50%">50%</option>
                  <option value="75%">75%</option>
                  <option value="25%">25%</option>
                </select>
              </PropRow>
              <PropRow label="Height">
                <select className={sCls} value={(block as { height: string }).height} onChange={(e) => set({ height: e.target.value })}>
                  <option value="auto">Auto</option>
                  <option value="fit">Fit content</option>
                  <option value="100px">100px</option>
                  <option value="200px">200px</option>
                  <option value="300px">300px</option>
                  <option value="400px">400px</option>
                </select>
              </PropRow>
            </Section>
            <Section title="Padding">
              {(["Top","Right","Bottom","Left"] as const).map((side) => {
                const key = `padding${side}` as "paddingTop"|"paddingRight"|"paddingBottom"|"paddingLeft";
                return (
                  <PropRow key={side} label={side}>
                    <input
                      type="number" min={0} max={200}
                      value={(block as unknown as Record<string, number>)[key] ?? 0}
                      onChange={(e) => set({ [key]: Number(e.target.value) })}
                      className="w-full border border-[#CDBBAD] rounded px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#5D1C34]/30 bg-white"
                    />
                  </PropRow>
                );
              })}
            </Section>
          </>
        )}

        {/* ── Heading ── */}
        {block.type === "heading" && (
          <>
            <Section title="Content">
              <PropRow label="Text">
                <input className={iCls} value={(block as { text: string }).text} onChange={(e) => set({ text: e.target.value })} />
              </PropRow>
            </Section>
            <Section title="Typography">
              <PropRow label="Level">
                <div className="flex gap-1">
                  {(["h1","h2","h3","h4"] as const).map((h) => (
                    <button key={h} onClick={() => set({ level: h })}
                      className={`flex-1 h-6 text-[10px] font-bold rounded border transition-colors ${(block as { level: string }).level === h ? "bg-[#5D1C34] text-white border-[#5D1C34]" : "border-[#CDBBAD] text-[#899581] hover:border-[#5D1C34]"}`}>
                      {h.toUpperCase()}
                    </button>
                  ))}
                </div>
              </PropRow>
              <PropRow label="Align">
                <AlignButtons value={(block as { align: string }).align} onChange={(v) => set({ align: v })} options={alignIcons} />
              </PropRow>
              <PropRow label="Color">
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={(block as { color: string }).color || "#11100E"}
                    onChange={(e) => set({ color: e.target.value })}
                    className="h-7 w-10 rounded border border-[#CDBBAD] px-0.5 cursor-pointer flex-shrink-0"
                  />
                  <input
                    className={iCls}
                    value={(block as { color: string }).color}
                    onChange={(e) => set({ color: e.target.value })}
                    placeholder="#11100E (default)"
                  />
                  {(block as { color: string }).color && (
                    <button
                      onClick={() => set({ color: "" })}
                      className="text-[9px] text-[#CDBBAD] hover:text-red-400 flex-shrink-0 transition-colors"
                      title="Reset to default"
                    >✕</button>
                  )}
                </div>
              </PropRow>
            </Section>
          </>
        )}

        {/* ── List ── */}
        {block.type === "list" && (
          <Section title="List">
            <PropRow label="Style">
              <div className="flex gap-1">
                {[{ v: "unordered", l: "Bullet" }, { v: "ordered", l: "Numbered" }].map(({ v, l }) => (
                  <button key={v} onClick={() => set({ style: v })}
                    className={`flex-1 h-6 text-[10px] rounded border transition-colors ${(block as { style: string }).style === v ? "bg-[#5D1C34] text-white border-[#5D1C34]" : "border-[#CDBBAD] text-[#899581] hover:border-[#5D1C34]"}`}>
                    {l}
                  </button>
                ))}
              </div>
            </PropRow>
            <PropRow label="Items"><span className="text-[10px] text-[#899581]">{(block as { items: string[] }).items.length} items — edit on canvas</span></PropRow>
          </Section>
        )}

        {/* ── Quote ── */}
        {block.type === "quote" && (
          <>
            <Section title="Content">
              <PropRow label="Quote"><textarea className={`${iCls} resize-none`} rows={3} value={(block as { text: string }).text} onChange={(e) => set({ text: e.target.value })} /></PropRow>
              <PropRow label="Author"><input className={iCls} value={(block as { author: string }).author} onChange={(e) => set({ author: e.target.value })} placeholder="— Name" /></PropRow>
            </Section>
            <Section title="Layout">
              <PropRow label="Style">
                <div className="flex gap-1">
                  {[{ v: "left", l: "Side bar" }, { v: "center", l: "Top bar" }].map(({ v, l }) => (
                    <button key={v} onClick={() => set({ align: v })}
                      className={`flex-1 h-6 text-[10px] rounded border transition-colors ${(block as { align: string }).align === v ? "bg-[#5D1C34] text-white border-[#5D1C34]" : "border-[#CDBBAD] text-[#899581] hover:border-[#5D1C34]"}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </PropRow>
            </Section>
          </>
        )}

        {/* ── Code ── */}
        {block.type === "code" && (
          <Section title="Code">
            <PropRow label="Language">
              <select className={sCls} value={(block as { language: string }).language} onChange={(e) => set({ language: e.target.value })}>
                {["javascript","typescript","python","cpp","c","html","css","bash","json","yaml"].map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </PropRow>
            <PropRow label="Caption"><input className={iCls} value={(block as { caption: string }).caption} onChange={(e) => set({ caption: e.target.value })} placeholder="Optional" /></PropRow>
          </Section>
        )}

        {/* ── Image ── */}
        {block.type === "image" && (() => {
          const img = block as import("@/lib/cms-store").ImageBlock;
          return (
            <>
              <Section title="Source">
                {/* Upload from device */}
                <div className="mb-2">
                  <label className="flex flex-col items-center justify-center gap-1.5 w-full border-2 border-dashed border-[#CDBBAD] rounded-lg py-3 px-2 cursor-pointer hover:border-[#5D1C34] hover:bg-[#5D1C34]/5 transition-colors group">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#CDBBAD] group-hover:text-[#5D1C34] transition-colors">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    <span className="text-[10px] text-[#899581] group-hover:text-[#5D1C34] transition-colors font-medium">Upload from device</span>
                    <span className="text-[9px] text-[#CDBBAD]">JPG, PNG, GIF, WebP, SVG</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          set({ src: reader.result as string, alt: img.alt || file.name.replace(/\.[^.]+$/, "") });
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                  {/* Preview thumbnail if src is a data URL */}
                  {img.src?.startsWith("data:") && (
                    <div className="mt-2 relative rounded-lg overflow-hidden border border-[#CDBBAD]/40 bg-[#F0E9E3]/40">
                      <img src={img.src} alt="preview" className="w-full h-16 object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/30">
                        <button
                          onClick={() => set({ src: "" })}
                          className="text-[9px] text-white bg-red-500 px-2 py-0.5 rounded font-medium"
                        >Remove</button>
                      </div>
                    </div>
                  )}
                </div>
                {/* Divider */}
                <div className="flex items-center gap-2 my-1">
                  <div className="flex-1 h-px bg-[#CDBBAD]/40" />
                  <span className="text-[9px] text-[#CDBBAD] font-medium">or paste URL</span>
                  <div className="flex-1 h-px bg-[#CDBBAD]/40" />
                </div>
                <PropRow label="URL">
                  <input className={iCls} value={img.src.startsWith("data:") ? "" : img.src} onChange={(e) => set({ src: e.target.value })} placeholder="https://…" />
                </PropRow>
                <PropRow label="Alt text">
                  <input className={iCls} value={img.alt} onChange={(e) => set({ alt: e.target.value })} />
                </PropRow>
                <PropRow label="Caption">
                  <input className={iCls} value={img.caption} onChange={(e) => set({ caption: e.target.value })} />
                </PropRow>
              </Section>

              <Section title="Dimensions">
                <PropRow label="Width">
                  <select className={sCls} value={img.width} onChange={(e) => set({ width: e.target.value })}>
                    <option value="auto">Auto</option>
                    <option value="full">Full (100%)</option>
                    <option value="fit">Fit content</option>
                    <option value="50%">50%</option>
                    <option value="75%">75%</option>
                    <option value="600px">600px</option>
                    <option value="800px">800px</option>
                  </select>
                </PropRow>
                <PropRow label="Height">
                  <select className={sCls} value={img.height} onChange={(e) => set({ height: e.target.value })}>
                    <option value="auto">Auto</option>
                    <option value="fit">Fit content</option>
                    <option value="200px">200px</option>
                    <option value="300px">300px</option>
                    <option value="400px">400px</option>
                    <option value="500px">500px</option>
                  </select>
                </PropRow>
                <PropRow label="Max Width">
                  <select className={sCls} value={img.maxWidth} onChange={(e) => set({ maxWidth: e.target.value })}>
                    <option value="none">None</option>
                    <option value="full">Full (100%)</option>
                    <option value="600px">600px</option>
                    <option value="800px">800px</option>
                    <option value="1200px">1200px</option>
                  </select>
                </PropRow>
                <PropRow label="Max Height">
                  <select className={sCls} value={img.maxHeight} onChange={(e) => set({ maxHeight: e.target.value })}>
                    <option value="none">None</option>
                    <option value="300px">300px</option>
                    <option value="400px">400px</option>
                    <option value="600px">600px</option>
                    <option value="800px">800px</option>
                  </select>
                </PropRow>
              </Section>

              <Section title="Display">
                <PropRow label="Object Fit">
                  <select className={sCls} value={img.objectFit} onChange={(e) => set({ objectFit: e.target.value })}>
                    <option value="cover">Cover</option>
                    <option value="contain">Contain</option>
                    <option value="fill">Fill</option>
                    <option value="none">None</option>
                    <option value="scale-down">Scale Down</option>
                  </select>
                </PropRow>
                <PropRow label="Position">
                  <select className={sCls} value={img.objectPosition} onChange={(e) => set({ objectPosition: e.target.value })}>
                    <option value="center">Center</option>
                    <option value="top">Top</option>
                    <option value="bottom">Bottom</option>
                    <option value="left">Left</option>
                    <option value="right">Right</option>
                    <option value="top left">Top Left</option>
                    <option value="top right">Top Right</option>
                    <option value="bottom left">Bottom Left</option>
                    <option value="bottom right">Bottom Right</option>
                  </select>
                </PropRow>
                <PropRow label={`Opacity: ${img.opacity}%`}>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={img.opacity}
                    onChange={(e) => set({ opacity: Number(e.target.value) })}
                    className="w-full accent-[#5D1C34]"
                  />
                </PropRow>
                {/* Color overlay / tint */}
                <div className="mt-1 pt-1 border-t border-[#F0E9E3]">
                  <span className="text-[10px] text-[#899581] block mb-1">Color Overlay</span>
                  <div className="flex gap-2 items-center mb-1">
                    <input
                      type="color"
                      value={img.overlayColor || "#000000"}
                      onChange={(e) => set({ overlayColor: e.target.value })}
                      className="h-7 w-10 rounded border border-[#CDBBAD] px-0.5 cursor-pointer flex-shrink-0"
                    />
                    <input
                      className={iCls}
                      value={img.overlayColor}
                      onChange={(e) => set({ overlayColor: e.target.value })}
                      placeholder="#000000 or empty to clear"
                    />
                    {img.overlayColor && (
                      <button
                        onClick={() => set({ overlayColor: "", overlayOpacity: 0 })}
                        className="text-[9px] text-[#CDBBAD] hover:text-red-400 flex-shrink-0 transition-colors"
                        title="Clear overlay"
                      >✕</button>
                    )}
                  </div>
                  <PropRow label={`Overlay: ${img.overlayOpacity}%`}>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={img.overlayOpacity}
                      onChange={(e) => set({ overlayOpacity: Number(e.target.value) })}
                      className="w-full accent-[#5D1C34]"
                    />
                  </PropRow>
                </div>
              </Section>

              <Section title="Layout">
                <PropRow label="Align">
                  <AlignButtons value={img.align} onChange={(v) => set({ align: v })} options={alignIcons} />
                </PropRow>
              </Section>

              <Section title="Border">
                <PropRow label="Style">
                  <div className="flex gap-1">
                    {(["none","solid","dashed","dotted"] as const).map((s) => (
                      <button key={s} onClick={() => set({ borderStyle: s })}
                        className={`flex-1 h-6 text-[9px] rounded border transition-colors capitalize ${img.borderStyle === s ? "bg-[#5D1C34] text-white border-[#5D1C34]" : "border-[#CDBBAD] text-[#899581] hover:border-[#5D1C34]"}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </PropRow>
                {img.borderStyle !== "none" && (
                  <>
                    <PropRow label="Color">
                      <div className="flex gap-2 items-center">
                        <input type="color" value={img.borderColor} onChange={(e) => set({ borderColor: e.target.value })}
                          className="h-7 w-10 rounded border border-[#CDBBAD] px-0.5 cursor-pointer" />
                        <input className={iCls} value={img.borderColor} onChange={(e) => set({ borderColor: e.target.value })} />
                      </div>
                    </PropRow>
                    <PropRow label="Width (px)">
                      <input type="number" min={0} max={20} value={img.borderWidth} onChange={(e) => set({ borderWidth: Number(e.target.value) })}
                        className={iCls} />
                    </PropRow>
                  </>
                )}
                <PropRow label="Full circle / pill">
                  <button onClick={() => set({ rounded: !img.rounded })}
                    className={`w-10 h-5 rounded-full transition-colors relative ${img.rounded ? "bg-[#5D1C34]" : "bg-[#CDBBAD]"}`}>
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${img.rounded ? "right-0.5" : "left-0.5"}`} />
                  </button>
                </PropRow>
                {!img.rounded && (
                  <PropRow label={`Radius: ${img.borderRadius}px`}>
                    <input type="range" min={0} max={100} value={img.borderRadius} onChange={(e) => set({ borderRadius: Number(e.target.value) })}
                      className="w-full accent-[#5D1C34]" />
                  </PropRow>
                )}
              </Section>
            </>
          );
        })()}

        {/* ── Cover ── */}
        {block.type === "cover" && (
          <>
            <Section title="Source">
              <PropRow label="Image URL"><input className={iCls} value={(block as { src: string }).src} onChange={(e) => set({ src: e.target.value })} placeholder="https://…" /></PropRow>
            </Section>
            <Section title="Content">
              <PropRow label="Heading"><input className={iCls} value={(block as { heading: string }).heading} onChange={(e) => set({ heading: e.target.value })} /></PropRow>
              <PropRow label="Subheading"><input className={iCls} value={(block as { subheading: string }).subheading} onChange={(e) => set({ subheading: e.target.value })} /></PropRow>
            </Section>
            <Section title="Style">
              <PropRow label="Height">
                <select className={sCls} value={(block as { height: string }).height} onChange={(e) => set({ height: e.target.value })}>
                  <option value="sm">Small — 160px</option><option value="md">Medium — 256px</option><option value="lg">Large — 384px</option><option value="full">Full screen</option>
                </select>
              </PropRow>
              <PropRow label="Text color">
                <input type="color" value={(block as { textColor: string }).textColor} onChange={(e) => set({ textColor: e.target.value })} className="h-7 w-full rounded border border-[#CDBBAD] px-0.5 cursor-pointer" />
              </PropRow>
              <PropRow label={`Overlay ${(block as { overlay: number }).overlay}%`}>
                <input type="range" min={0} max={90} value={(block as { overlay: number }).overlay} onChange={(e) => set({ overlay: Number(e.target.value) })} className="w-full accent-[#5D1C34]" />
              </PropRow>
            </Section>
          </>
        )}

        {/* ── Audio ── */}
        {block.type === "audio" && (
          <Section title="Audio">
            <PropRow label="URL"><input className={iCls} value={(block as { src: string }).src} onChange={(e) => set({ src: e.target.value })} placeholder="https://…" /></PropRow>
            <PropRow label="Title"><input className={iCls} value={(block as { title: string }).title} onChange={(e) => set({ title: e.target.value })} /></PropRow>
            <PropRow label="Caption"><input className={iCls} value={(block as { caption: string }).caption} onChange={(e) => set({ caption: e.target.value })} /></PropRow>
          </Section>
        )}

        {/* ── Video ── */}
        {block.type === "video" && (
          <Section title="Video">
            <PropRow label="URL"><input className={iCls} value={(block as { src: string }).src} onChange={(e) => set({ src: e.target.value })} placeholder="https://youtube.com/embed/…" /></PropRow>
            <PropRow label="Title"><input className={iCls} value={(block as { title: string }).title} onChange={(e) => set({ title: e.target.value })} /></PropRow>
            <PropRow label="Caption"><input className={iCls} value={(block as { caption: string }).caption} onChange={(e) => set({ caption: e.target.value })} /></PropRow>
            <PropRow label="Autoplay">
              <button onClick={() => set({ autoplay: !(block as { autoplay: boolean }).autoplay })}
                className={`w-10 h-5 rounded-full transition-colors relative ${(block as { autoplay: boolean }).autoplay ? "bg-[#5D1C34]" : "bg-[#CDBBAD]"}`}>
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${(block as { autoplay: boolean }).autoplay ? "right-0.5" : "left-0.5"}`} />
              </button>
            </PropRow>
          </Section>
        )}

        {/* ── Button ── */}
        {block.type === "button" && (
          <>
            <Section title="Content">
              <PropRow label="Text"><input className={iCls} value={(block as { text: string }).text} onChange={(e) => set({ text: e.target.value })} /></PropRow>
              <PropRow label="Link"><input className={iCls} value={(block as { link: string }).link} onChange={(e) => set({ link: e.target.value })} placeholder="/page or https://…" /></PropRow>
              <PropRow label="New tab">
                <button onClick={() => set({ openNewTab: !(block as { openNewTab: boolean }).openNewTab })}
                  className={`w-10 h-5 rounded-full transition-colors relative ${(block as { openNewTab: boolean }).openNewTab ? "bg-[#5D1C34]" : "bg-[#CDBBAD]"}`}>
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${(block as { openNewTab: boolean }).openNewTab ? "right-0.5" : "left-0.5"}`} />
                </button>
              </PropRow>
            </Section>
            <Section title="Style">
              <PropRow label="Variant">
                <select className={sCls} value={(block as { variant: string }).variant} onChange={(e) => set({ variant: e.target.value })}>
                  <option value="primary">Primary</option><option value="secondary">Secondary</option><option value="outline">Outline</option><option value="ghost">Ghost</option>
                </select>
              </PropRow>
              <PropRow label="Size">
                <div className="flex gap-1">
                  {[{ v: "sm", l: "S" }, { v: "md", l: "M" }, { v: "lg", l: "L" }].map(({ v, l }) => (
                    <button key={v} onClick={() => set({ size: v })}
                      className={`flex-1 h-6 text-[10px] font-bold rounded border transition-colors ${(block as { size: string }).size === v ? "bg-[#5D1C34] text-white border-[#5D1C34]" : "border-[#CDBBAD] text-[#899581] hover:border-[#5D1C34]"}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </PropRow>
              <PropRow label="Align"><AlignButtons value={(block as { align: string }).align} onChange={(v) => set({ align: v })} options={alignIcons} /></PropRow>
            </Section>
          </>
        )}

        {/* ── Container ── */}
        {block.type === "container" && (() => {
          const b = block as import("@/lib/cms-store").ContainerBlock;
          const SpacingGrid = ({ label, values, keys }: { label: string; values: number[]; keys: string[] }) => (
            <div className="space-y-1">
              <span className="text-[10px] text-[#899581]">{label}</span>
              <div className="grid grid-cols-2 gap-1">
                {["Top","Right","Bottom","Left"].map((side, i) => (
                  <div key={side} className="flex items-center gap-1">
                    <span className="text-[9px] text-[#CDBBAD] w-8">{side}</span>
                    <input type="number" min={0} max={200} value={values[i]}
                      onChange={(e) => set({ [keys[i]]: Number(e.target.value) })}
                      className="w-full border border-[#CDBBAD] rounded px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#5D1C34]/30 bg-white" />
                  </div>
                ))}
              </div>
            </div>
          );
          return (
            <>
              <Section title="Dimensions">
                <PropRow label="Width">
                  <select className={sCls} value={b.width} onChange={(e) => set({ width: e.target.value })}>
                    <option value="auto">Auto (fill parent)</option>
                    <option value="fit">Fit content</option>
                    <option value="full">Full (100%)</option>
                    <option value="50%">50%</option>
                    <option value="75%">75%</option>
                  </select>
                </PropRow>
                <PropRow label="Height">
                  <select className={sCls} value={b.height} onChange={(e) => set({ height: e.target.value })}>
                    <option value="auto">Auto</option>
                    <option value="full">Full (100%)</option>
                    <option value="fit">Fit content</option>
                    <option value="200px">200px</option>
                    <option value="400px">400px</option>
                  </select>
                </PropRow>
              </Section>

              <Section title="Spacing">
                <SpacingGrid label="Padding (px)" values={[b.paddingTop,b.paddingRight,b.paddingBottom,b.paddingLeft]} keys={["paddingTop","paddingRight","paddingBottom","paddingLeft"]} />
                <div className="mt-2">
                  <SpacingGrid label="Margin (px)" values={[b.marginTop,b.marginRight,b.marginBottom,b.marginLeft]} keys={["marginTop","marginRight","marginBottom","marginLeft"]} />
                </div>
              </Section>

              <Section title="Background">
                <PropRow label="Color">
                  <div className="flex gap-2 items-center">
                    <input type="color" value={b.bgColor || "#ffffff"} onChange={(e) => set({ bgColor: e.target.value, bgGradient: "" })}
                      className="h-7 w-12 rounded border border-[#CDBBAD] px-0.5 cursor-pointer" />
                    <input className={iCls} value={b.bgColor} onChange={(e) => set({ bgColor: e.target.value })} placeholder="#ffffff or transparent" />
                  </div>
                </PropRow>
                <PropRow label="Gradient">
                  <input className={iCls} value={b.bgGradient} onChange={(e) => set({ bgGradient: e.target.value })}
                    placeholder="linear-gradient(135deg, #5D1C34, #A67D45)" />
                </PropRow>
                <PropRow label="Image URL">
                  <input className={iCls} value={b.bgImage} onChange={(e) => set({ bgImage: e.target.value })} placeholder="https://…" />
                </PropRow>
              </Section>

              <Section title="Border">
                <PropRow label="Style">
                  <div className="flex gap-1">
                    {(["none","solid","dashed","dotted"] as const).map((s) => (
                      <button key={s} onClick={() => set({ borderStyle: s })}
                        className={`flex-1 h-6 text-[9px] rounded border transition-colors capitalize ${b.borderStyle === s ? "bg-[#5D1C34] text-white border-[#5D1C34]" : "border-[#CDBBAD] text-[#899581] hover:border-[#5D1C34]"}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </PropRow>
                {b.borderStyle !== "none" && (
                  <>
                    <PropRow label="Color">
                      <div className="flex gap-2 items-center">
                        <input type="color" value={b.borderColor} onChange={(e) => set({ borderColor: e.target.value })}
                          className="h-7 w-10 rounded border border-[#CDBBAD] px-0.5 cursor-pointer" />
                        <input className={iCls} value={b.borderColor} onChange={(e) => set({ borderColor: e.target.value })} />
                      </div>
                    </PropRow>
                    <PropRow label="Width (px)">
                      <input type="number" min={0} max={20} value={b.borderWidth} onChange={(e) => set({ borderWidth: Number(e.target.value) })}
                        className={iCls} />
                    </PropRow>
                  </>
                )}
                <PropRow label={`Radius: ${b.borderRadius}px`}>
                  <input type="range" min={0} max={48} value={b.borderRadius} onChange={(e) => set({ borderRadius: Number(e.target.value) })}
                    className="w-full accent-[#5D1C34]" />
                </PropRow>
              </Section>

              <Section title="Shadow">
                <PropRow label="Box Shadow">
                  <div className="flex gap-1 flex-wrap">
                    {(["none","sm","md","lg","xl"] as const).map((s) => (
                      <button key={s} onClick={() => set({ boxShadow: s })}
                        className={`px-2 h-6 text-[9px] rounded border transition-colors uppercase ${b.boxShadow === s ? "bg-[#5D1C34] text-white border-[#5D1C34]" : "border-[#CDBBAD] text-[#899581] hover:border-[#5D1C34]"}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </PropRow>
              </Section>

              <Section title="Child">
                {(() => {
                  const [pickerOpen, setPickerOpen] = useState(false);
                  const CHILD_GROUPS: { label: string; types: BlockType[] }[] = [
                    { label: "Text",   types: ["paragraph","heading","list","table","quote","code"] },
                    { label: "Media",  types: ["image","cover","audio","video"] },
                    { label: "Layout", types: ["button","row","column"] },
                  ];
                  const child = b.children[0];
                  const setChild = (type: BlockType) => {
                    onChange({ ...b, children: [BLOCK_DEFAULTS[type]()] } as Block);
                    setPickerOpen(false);
                  };
                  const removeChild = () => onChange({ ...b, children: [] } as Block);
                  return (
                    <>
                      {child ? (
                        <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-[#F0E9E3]/60 border border-[#CDBBAD]/40 mb-2">
                          <span className="text-[9px] font-bold text-[#5D1C34] w-5 flex-shrink-0">{BLOCK_META[child.type].icon}</span>
                          <span className="text-[10px] font-medium text-[#11100E] flex-1 truncate">{BLOCK_META[child.type].label}</span>
                          <button onClick={() => removeChild()} className="p-0.5 rounded text-[#CDBBAD] hover:text-red-500"><Trash2 size={10}/></button>
                        </div>
                      ) : (
                        <p className="text-[10px] text-[#CDBBAD] py-1 text-center">No child yet.</p>
                      )}
                      <button onClick={() => setPickerOpen(v => !v)}
                        className="w-full flex items-center justify-center gap-1.5 border-2 border-dashed border-[#CDBBAD] rounded-lg py-2 text-[10px] text-[#899581] hover:border-[#5D1C34] hover:text-[#5D1C34] transition-colors">
                        <Plus size={12}/> {child ? "Replace Child" : "Set Child Block"}
                      </button>
                      {pickerOpen && (
                        <div className="mt-2 border border-[#CDBBAD]/50 rounded-xl overflow-hidden bg-white shadow-lg">
                          {CHILD_GROUPS.map((g) => (
                            <div key={g.label}>
                              <p className="text-[9px] font-bold text-[#899581] uppercase tracking-widest px-3 py-1.5 bg-[#F0E9E3]/60 border-b border-[#CDBBAD]/30">{g.label}</p>
                              <div className="grid grid-cols-3 gap-0 divide-x divide-y divide-[#CDBBAD]/20">
                                {g.types.map((type) => (
                                  <button key={type} onClick={() => setChild(type)}
                                    className="flex flex-col items-center gap-1 py-2.5 px-1 hover:bg-[#5D1C34]/5 transition-colors group">
                                    <span className="text-[9px] font-bold text-[#5D1C34] w-6 h-6 rounded bg-[#5D1C34]/10 group-hover:bg-[#5D1C34]/20 flex items-center justify-center">{BLOCK_META[type].icon}</span>
                                    <span className="text-[9px] text-[#899581] group-hover:text-[#5D1C34] text-center leading-tight">{BLOCK_META[type].label}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                          <button onClick={() => setPickerOpen(false)} className="w-full py-1.5 text-[9px] text-[#CDBBAD] hover:text-[#899581] border-t border-[#CDBBAD]/30">Cancel</button>
                        </div>
                      )}
                    </>
                  );
                })()}
              </Section>
            </>
          );
        })()}

        {/* ── Row / Column ── */}
        {(block.type === "row" || block.type === "column") && (() => {
          const container = block as RowBlock | ColumnBlock;
          const [pickerOpen, setPickerOpen] = useState(false);

          const CHILD_GROUPS: { label: string; types: BlockType[] }[] = [
            { label: "Text",      types: ["paragraph","heading","list","table","quote","code"] },
            { label: "Media",     types: ["image","cover","audio","video"] },
            { label: "Layout",    types: ["button","container","row","column"] },
          ];

          const addChild = (type: BlockType) => {
            const newChild = type === "container"
              ? BLOCK_DEFAULTS["container"]()
              : (type === "row" || type === "column")
              ? BLOCK_DEFAULTS[type]()
              : BLOCK_DEFAULTS[type]();
            onChange({ ...container, children: [...container.children, newChild] } as Block);
            setPickerOpen(false);
          };

          const removeChild = (id: string) => {
            onChange({ ...container, children: container.children.filter(c => c.id !== id) } as Block);
          };

          const moveChild = (idx: number, dir: "up" | "down") => {
            const ch = [...container.children];
            const swap = dir === "up" ? idx - 1 : idx + 1;
            if (swap < 0 || swap >= ch.length) return;
            [ch[idx], ch[swap]] = [ch[swap], ch[idx]];
            onChange({ ...container, children: ch } as Block);
          };

          return (
            <>
              <Section title="Alignment">
                {/* Main Axis — justifyContent */}
                <PropRow label="Main Axis">
                  <select className={sCls} value={(container as {justifyContent?: string}).justifyContent ?? "flex-start"} onChange={(e) => onChange({ ...container, justifyContent: e.target.value } as Block)}>
                    <option value="flex-start">Start</option>
                    <option value="center">Center</option>
                    <option value="flex-end">End</option>
                    <option value="space-between">Space Between</option>
                    <option value="space-around">Space Around</option>
                  </select>
                </PropRow>
                {/* Cross Axis — alignItems */}
                <PropRow label="Cross Axis">
                  <select className={sCls} value={(container as {alignItems?: string}).alignItems ?? "flex-start"} onChange={(e) => onChange({ ...container, alignItems: e.target.value } as Block)}>
                    <option value="flex-start">Start</option>
                    <option value="center">Center</option>
                    <option value="flex-end">End</option>
                    <option value="space-between">Space Between</option>
                    <option value="space-around">Space Around</option>
                    <option value="stretch">Stretch</option>
                  </select>
                </PropRow>
              </Section>

              <Section title="Dimensions">
                <PropRow label="Width">
                  <select className={sCls} value={(container as {width?: string}).width ?? "auto"} onChange={(e) => onChange({ ...container, width: e.target.value } as Block)}>
                    <option value="auto">Auto (fill parent)</option>
                    <option value="full">Full (100%)</option>
                    <option value="fit">Fit content</option>
                    <option value="50%">50%</option>
                    <option value="75%">75%</option>
                  </select>
                </PropRow>
                <PropRow label="Height">
                  <select className={sCls} value={(container as {height?: string}).height ?? "auto"} onChange={(e) => onChange({ ...container, height: e.target.value } as Block)}>
                    <option value="auto">Auto (fill parent)</option>
                    <option value="full">Full (100%)</option>
                    <option value="fit">Fit content</option>
                    <option value="200px">200px</option>
                    <option value="400px">400px</option>
                    <option value="600px">600px</option>
                  </select>
                </PropRow>
              </Section>

              <Section title={`Children (${container.children.length})`}>
                {/* Child list */}
                {container.children.length === 0 ? (
                  <p className="text-[10px] text-[#CDBBAD] py-2 text-center">No children yet. Add one below.</p>
                ) : (
                  <div className="space-y-1 mb-2">
                    {container.children.map((child, idx) => (
                      <div key={child.id}
                        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-[#F0E9E3]/60 border border-[#CDBBAD]/40 group">
                        {/* Drag handle */}
                        <GripVertical size={11} className="text-[#CDBBAD] flex-shrink-0" />
                        {/* Icon + label */}
                        <span className="text-[9px] font-bold text-[#5D1C34] w-5 flex-shrink-0">{BLOCK_META[child.type].icon}</span>
                        <span className="text-[10px] font-medium text-[#11100E] flex-1 truncate">{BLOCK_META[child.type].label}</span>
                        {/* Move up/down */}
                        <button onClick={() => moveChild(idx, "up")} disabled={idx === 0}
                          className="p-0.5 rounded text-[#CDBBAD] hover:text-[#5D1C34] disabled:opacity-20 transition-colors">
                          <ChevronUp size={10} />
                        </button>
                        <button onClick={() => moveChild(idx, "down")} disabled={idx === container.children.length - 1}
                          className="p-0.5 rounded text-[#CDBBAD] hover:text-[#5D1C34] disabled:opacity-20 transition-colors">
                          <ChevronDown size={10} />
                        </button>
                        {/* Delete */}
                        <button onClick={() => removeChild(child.id)}
                          className="p-0.5 rounded text-[#CDBBAD] hover:text-red-500 transition-colors">
                          <Trash2 size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add child button */}
                <button onClick={() => setPickerOpen(v => !v)}
                  className="w-full flex items-center justify-center gap-1.5 border-2 border-dashed border-[#CDBBAD] rounded-lg py-2 text-[10px] text-[#899581] hover:border-[#5D1C34] hover:text-[#5D1C34] transition-colors">
                  <Plus size={12} /> Add Child Block
                </button>

                {/* Inline block picker */}
                {pickerOpen && (
                  <div className="mt-2 border border-[#CDBBAD]/50 rounded-xl overflow-hidden bg-white shadow-lg">
                    {CHILD_GROUPS.map((g) => (
                      <div key={g.label}>
                        <p className="text-[9px] font-bold text-[#899581] uppercase tracking-widest px-3 py-1.5 bg-[#F0E9E3]/60 border-b border-[#CDBBAD]/30">{g.label}</p>
                        <div className="grid grid-cols-3 gap-0 divide-x divide-y divide-[#CDBBAD]/20">
                          {g.types.map((type) => (
                            <button key={type} onClick={() => addChild(type)}
                              className="flex flex-col items-center gap-1 py-2.5 px-1 hover:bg-[#5D1C34]/5 transition-colors group">
                              <span className="text-[9px] font-bold text-[#5D1C34] w-6 h-6 rounded bg-[#5D1C34]/10 group-hover:bg-[#5D1C34]/20 flex items-center justify-center transition-colors">
                                {BLOCK_META[type].icon}
                              </span>
                              <span className="text-[9px] text-[#899581] group-hover:text-[#5D1C34] text-center leading-tight">
                                {BLOCK_META[type].label}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                    <button onClick={() => setPickerOpen(false)}
                      className="w-full py-1.5 text-[9px] text-[#CDBBAD] hover:text-[#899581] border-t border-[#CDBBAD]/30 transition-colors">
                      Cancel
                    </button>
                  </div>
                )}
              </Section>
            </>
          );
        })()}

        {/* Table */}
        {block.type === "table" && (
          <Section title="Table">
            <PropRow label="Columns"><span className="text-[10px] text-[#899581]">{(block as { headers: string[] }).headers.length} columns</span></PropRow>
            <PropRow label="Rows"><span className="text-[10px] text-[#899581]">{(block as { rows: unknown[][] }).rows.length} rows</span></PropRow>
            <p className="text-[10px] text-[#CDBBAD] pt-1">Edit cells directly on the canvas.</p>
          </Section>
        )}

      </div>

      {/* Delete */}
      <div className="px-3 py-3 border-t border-[#CDBBAD]/40">
        <button
          onClick={onDelete}
          className="w-full flex items-center justify-center gap-1.5 border border-red-200 text-red-500 py-2 rounded-lg text-xs hover:bg-red-50 transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
          Delete {BLOCK_META[block.type].label}
        </button>
      </div>
    </div>
  );
}
