"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import type { Block } from "@/lib/cms-store";
import { BLOCK_META, BLOCK_DEFAULTS } from "@/lib/cms-store";
import BlockPreview from "@/components/admin/BlockPreview";
import RichTextEditor from "@/components/admin/RichTextEditor";
import type { SelectionInfo } from "@/components/admin/RichTextEditor";

interface Props {
  block: Block;
  onChange: (updated: Block) => void;
  onSelectionChange?: (info: SelectionInfo | null) => void;
}

const alignCls = { left: "text-left", center: "text-center", right: "text-right" };

function uid() { return Math.random().toString(36).slice(2, 10); }

function makeNestedBlock(type: string): Block {
  if (type === "container") return BLOCK_DEFAULTS["container"]();
  if (type === "row" || type === "column") return BLOCK_DEFAULTS[type]();
  return BLOCK_DEFAULTS[type as keyof typeof BLOCK_DEFAULTS]();
}

const NESTED_GROUPS = [
  { label: "Text",   types: ["paragraph","heading","list","quote","code","table"] },
  { label: "Media",  types: ["image","cover","audio","video"] },
  { label: "Layout", types: ["button","container","row","column"] },
];

function NestedPicker({ onPick, onClose }: { onPick: (b: Block) => void; onClose: () => void }) {
  return (
    <div className="mt-1 border border-[#CDBBAD]/50 rounded-xl overflow-hidden bg-white shadow-lg relative z-20">
      {NESTED_GROUPS.map((g) => (
        <div key={g.label}>
          <p className="text-[9px] font-bold text-[#899581] uppercase tracking-widest px-3 py-1 bg-[#F0E9E3]/60 border-b border-[#CDBBAD]/30">{g.label}</p>
          <div className="grid grid-cols-4 gap-0 divide-x divide-y divide-[#CDBBAD]/20">
            {g.types.map((type) => (
              <button key={type} onClick={() => { onPick(makeNestedBlock(type)); onClose(); }}
                className="flex flex-col items-center gap-1 py-2 px-1 hover:bg-[#5D1C34]/5 transition-colors group">
                <span className="text-[9px] font-bold text-[#5D1C34] w-5 h-5 rounded bg-[#5D1C34]/10 group-hover:bg-[#5D1C34]/20 flex items-center justify-center">{BLOCK_META[type as keyof typeof BLOCK_META]?.icon ?? type[0].toUpperCase()}</span>
                <span className="text-[9px] text-[#899581] group-hover:text-[#5D1C34] text-center leading-tight">{BLOCK_META[type as keyof typeof BLOCK_META]?.label ?? type}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
      <button onClick={onClose} className="w-full py-1 text-[9px] text-[#CDBBAD] hover:text-[#899581] border-t border-[#CDBBAD]/30">Cancel</button>
    </div>
  );
}

function NestedContainerBlock({ block, onChange }: { block: Block & { children: Block[] }; onChange: (b: Block) => void }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const isRow = block.type === "row";
  const isContainer = block.type === "container";
  const label = isContainer ? "Container" : isRow ? "Row" : "Column";
  const accent = isRow ? "#A67D45" : "#5D1C34";

  // row/column use their own alignItems/justifyContent; container is a plain wrapper
  const flexDir    = isRow ? "row" : "column";
  const isFlexRow  = flexDir === "row";
  const alignItems     = (block as {alignItems?: string}).alignItems     ?? "flex-start";
  const justifyContent = (block as {justifyContent?: string}).justifyContent ?? "flex-start";

  // Container decoration styles (no flex layout for container)
  const resolveContainerWidth = (w: string) => {
    if (w === "auto" || !w) return undefined;
    if (w === "full") return "100%";
    if (w === "fit") return "fit-content";
    return w;
  };
  const containerStyle: React.CSSProperties = isContainer ? {
    paddingTop:    (block as {paddingTop: number}).paddingTop,
    paddingRight:  (block as {paddingRight: number}).paddingRight,
    paddingBottom: (block as {paddingBottom: number}).paddingBottom,
    paddingLeft:   (block as {paddingLeft: number}).paddingLeft,
    width:         resolveContainerWidth((block as {width: string}).width),
    background:    (block as {bgGradient: string}).bgGradient
                   || ((block as {bgImage: string}).bgImage ? `url(${(block as {bgImage: string}).bgImage}) center/cover no-repeat` : undefined)
                   || (block as {bgColor: string}).bgColor
                   || undefined,
    borderRadius:  (block as {borderRadius: number}).borderRadius,
    borderWidth:   (block as {borderWidth: number}).borderWidth > 0 ? (block as {borderWidth: number}).borderWidth : undefined,
    borderStyle:   (block as {borderStyle: string}).borderStyle !== "none" ? (block as {borderStyle: string}).borderStyle as React.CSSProperties["borderStyle"] : undefined,
    borderColor:   (block as {borderWidth: number}).borderWidth > 0 ? (block as {borderColor: string}).borderColor : undefined,
  } : {};

  const setChild    = (child: Block) => onChange({ ...block, children: [child] } as Block);
  const addChild    = (child: Block) => onChange({ ...block, children: isContainer ? [child] : [...block.children, child] } as Block);
  const updateChild = (updated: Block) => onChange({ ...block, children: block.children.map(c => c.id === updated.id ? updated : c) } as Block);
  const removeChild = (id: string) => onChange({ ...block, children: block.children.filter(c => c.id !== id) } as Block);

  // Container: single child
  if (isContainer) {
    const child = block.children[0];
    return (
      <div className="w-full">
        <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded text-white mb-1" style={{ background: accent }}>Container</span>
        <div style={{ ...containerStyle, minHeight: 48, width: "100%" }} className="border border-dashed border-[#CDBBAD]/60 rounded-lg p-2">
          {child ? (
            <div className="relative group/nested">
              <button onClick={() => removeChild(child.id)}
                className="absolute -top-1.5 -right-1.5 z-20 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover/nested:opacity-100 transition-all shadow-sm">
                <Trash2 size={10}/>
              </button>
              <div className="absolute top-0 left-0 z-10 px-1.5 py-0.5 rounded-br text-[8px] font-bold bg-[#5D1C34]/80 text-white opacity-0 group-hover/nested:opacity-100 transition-opacity">
                {BLOCK_META[child.type]?.label}
              </div>
              {"children" in child && Array.isArray((child as {children: Block[]}).children)
                ? <NestedContainerBlock block={child as Block & { children: Block[] }} onChange={updateChild} />
                : <div className="rounded overflow-hidden border border-[#CDBBAD]/30 bg-white p-1.5"><InlineBlockEditor block={child} onChange={updateChild} /></div>
              }
            </div>
          ) : (
            <button onClick={() => setPickerOpen(v => !v)}
              className="w-full flex flex-col items-center justify-center gap-1.5 py-4 text-[#CDBBAD] hover:text-[#5D1C34] transition-colors">
              <div className="w-7 h-7 rounded-full border-2 border-dashed border-current flex items-center justify-center"><Plus size={14} strokeWidth={2}/></div>
              <span className="text-[9px]">Empty Container — click to add</span>
            </button>
          )}
        </div>
        {pickerOpen && <NestedPicker onPick={addChild} onClose={() => setPickerOpen(false)} />}
      </div>
    );
  }

  return (
    <div className="w-full">
      <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded text-white mb-1" style={{ background: accent }}>{label}</span>
      <div
        style={{
          display: "flex",
          flexDirection: isFlexRow ? "row" : "column",
          alignItems,
          justifyContent,
          gap: "8px",
          width:  (() => { const w = (block as {width?: string}).width ?? "auto"; return w === "auto" || !w ? "100%" : w === "full" ? "100%" : w === "fit" ? "fit-content" : w; })(),
          height: (() => { const h = (block as {height?: string}).height ?? "auto"; return h === "auto" || !h ? undefined : h === "full" ? "100%" : h === "fit" ? "fit-content" : h; })(),
        }}
        className="border border-dashed border-[#CDBBAD]/60 rounded-lg p-2"
      >
        {block.children.map((child) => {
          const hasChildren = "children" in child && Array.isArray((child as {children: Block[]}).children);
          const childStyle: React.CSSProperties = isFlexRow ? {
            flex: (justifyContent === "space-between" || justifyContent === "space-around") ? "0 1 auto" : "1 1 0",
            minWidth: 0,
          } : { width: "100%" };
          return (
            <div key={child.id} style={childStyle} className="relative group/nested">
              <button onClick={() => removeChild(child.id)}
                className="absolute -top-1.5 -right-1.5 z-20 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover/nested:opacity-100 transition-all shadow-sm">
                <Trash2 size={10}/>
              </button>
              <div className="absolute top-0 left-0 z-10 px-1.5 py-0.5 rounded-br text-[8px] font-bold bg-[#5D1C34]/80 text-white opacity-0 group-hover/nested:opacity-100 transition-opacity">
                {BLOCK_META[child.type]?.label}
              </div>
              {hasChildren
                ? <NestedContainerBlock block={child as Block & { children: Block[] }} onChange={updateChild} />
                : <div className="rounded overflow-hidden border border-[#CDBBAD]/30 bg-white p-1.5"><InlineBlockEditor block={child} onChange={updateChild} /></div>
              }
            </div>
          );
        })}
        {block.children.length === 0 && (
          <button onClick={() => setPickerOpen(v => !v)}
            className="w-full flex flex-col items-center justify-center gap-1.5 py-4 text-[#CDBBAD] hover:text-[#5D1C34] transition-colors">
            <div className="w-7 h-7 rounded-full border-2 border-dashed border-current flex items-center justify-center"><Plus size={14} strokeWidth={2}/></div>
            <span className="text-[9px]">Empty {label} — click to add</span>
          </button>
        )}
        {block.children.length > 0 && (
          <div className={isFlexRow ? "flex items-center" : "flex justify-end"}>
            <button onClick={() => setPickerOpen(v => !v)}
              className="w-7 h-7 rounded-full border-2 border-dashed border-[#CDBBAD] hover:border-[#5D1C34] flex items-center justify-center text-[#CDBBAD] hover:text-[#5D1C34] transition-all bg-white shadow-sm">
              <Plus size={12} strokeWidth={2}/>
            </button>
          </div>
        )}
      </div>
      {pickerOpen && <NestedPicker onPick={addChild} onClose={() => setPickerOpen(false)} />}
    </div>
  );
}

export default function InlineBlockEditor({ block, onChange, onSelectionChange }: Props) {
  const set = (patch: object) => onChange({ ...block, ...patch } as Block);

  switch (block.type) {

    // ── Paragraph — full rich text toolbar ──────────────────────────────────
    case "paragraph":
      return (
        <RichTextEditor
          block={block}
          onChange={onChange}
          onSelectionChange={onSelectionChange}
        />
      );

    // ── Heading — contentEditable ────────────────────────────────────────────
    case "heading": {
      const Tag = block.level as "h1" | "h2" | "h3" | "h4";
      const sz = { h1: "text-4xl font-extrabold", h2: "text-3xl font-bold", h3: "text-2xl font-bold", h4: "text-xl font-semibold" };
      return (
        <Tag
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => set({ text: e.currentTarget.textContent ?? "" })}
          style={{ color: block.color || "#11100E" }}
          className={`py-1 outline-none min-h-[1em]
            focus:bg-blue-50/30 focus:ring-1 focus:ring-[#5D1C34]/20 rounded px-1
            ${sz[block.level]} ${alignCls[block.align]}`}
        >
          {block.text}
        </Tag>
      );
    }

    // ── Quote — contentEditable ──────────────────────────────────────────────
    case "quote":
      return (
        <blockquote className={`border-l-4 border-[#5D1C34] pl-5 py-3 ${block.align === "center" ? "text-center border-l-0 border-t-4 pt-5 pl-0" : ""}`}>
          <p
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => set({ text: e.currentTarget.textContent ?? "" })}
            className="text-lg italic text-[#11100E] leading-relaxed outline-none focus:bg-blue-50/30 focus:ring-1 focus:ring-[#5D1C34]/20 rounded px-1"
          >
            {block.text}
          </p>
          <footer
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => set({ author: e.currentTarget.textContent ?? "" })}
            className="text-sm text-[#899581] mt-2 font-medium outline-none focus:bg-blue-50/30 rounded px-1"
          >
            {block.author || "— Author"}
          </footer>
        </blockquote>
      );

    // ── List — inline editable items ────────────────────────────────────────
    case "list": {
      const ListTag = block.style === "ordered" ? "ol" : "ul";
      const listCls = block.style === "ordered" ? "list-decimal" : "list-disc";
      return (
        <ListTag className={`${listCls} list-inside space-y-1.5 py-2`}>
          {block.items.map((item, i) => (
            <li
              key={i}
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => {
                const items = [...block.items];
                items[i] = e.currentTarget.textContent ?? "";
                set({ items });
              }}
              className="text-sm text-[#11100E] outline-none focus:bg-blue-50/30 focus:ring-1 focus:ring-[#5D1C34]/20 rounded px-1"
            >
              {item}
            </li>
          ))}
        </ListTag>
      );
    }

    // ── Code — textarea ──────────────────────────────────────────────────────
    case "code":
      return (
        <div className="bg-[#11100E] rounded-xl overflow-hidden">
          {block.language && (
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
              <span className="text-xs text-[#899581] font-mono uppercase">{block.language}</span>
              <div className="flex gap-1.5">
                {["bg-red-500","bg-amber-400","bg-green-500"].map((c,i)=><span key={i} className={`w-2.5 h-2.5 rounded-full ${c}`}/>)}
              </div>
            </div>
          )}
          <textarea
            value={block.code}
            onChange={(e) => set({ code: e.target.value })}
            rows={Math.max(4, block.code.split("\n").length + 1)}
            spellCheck={false}
            className="w-full bg-transparent p-4 text-sm text-[#CDBBAD] font-mono leading-relaxed resize-none outline-none focus:ring-1 focus:ring-[#5D1C34]/40"
          />
          {block.caption && <p className="text-xs text-[#899581] text-center pb-2">{block.caption}</p>}
        </div>
      );

    // ── Button — inline text edit ────────────────────────────────────────────
    case "button": {
      const variants = {
        primary:   "bg-[#5D1C34] text-white",
        secondary: "bg-[#A67D45] text-white",
        outline:   "border-2 border-[#5D1C34] text-[#5D1C34]",
        ghost:     "text-[#5D1C34] underline",
      };
      const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-5 py-2.5 text-sm", lg: "px-7 py-3 text-base" };
      const wrapAlign = { left: "text-left", center: "text-center", right: "text-right" };
      return (
        <div className={`py-2 ${wrapAlign[block.align]}`}>
          <span
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => set({ text: e.currentTarget.textContent ?? "" })}
            className={`inline-block font-semibold rounded-lg cursor-text outline-none
              focus:ring-2 focus:ring-[#5D1C34]/30 ${variants[block.variant]} ${sizes[block.size]}`}
          >
            {block.text}
          </span>
          <p className="text-[10px] text-[#CDBBAD] mt-1">
            Links to: <span className="font-mono">{block.link}</span> — edit in panel
          </p>
        </div>
      );
    }

    // ── Image ────────────────────────────────────────────────────────────────
    case "image": {
      const widthMap:  Record<string, string> = { auto: "auto", full: "100%", fit: "fit-content" };
      const heightMap: Record<string, string> = { auto: "auto", fit: "fit-content" };
      const alignWrap = { left: "mr-auto", center: "mx-auto", right: "ml-auto" };
      return (
        <figure className="py-2">
          <div
            className={`overflow-hidden relative ${alignWrap[block.align]}`}
            style={{
              width:        widthMap[block.width]   ?? block.width,
              height:       heightMap[block.height] ?? block.height,
              maxWidth:     block.maxWidth  === "none" ? undefined : (block.maxWidth  === "full" ? "100%" : block.maxWidth),
              maxHeight:    block.maxHeight === "none" ? undefined : block.maxHeight,
              borderColor:  block.borderWidth > 0 ? block.borderColor : undefined,
              borderWidth:  block.borderWidth > 0 ? block.borderWidth : undefined,
              borderStyle:  block.borderStyle !== "none" ? block.borderStyle as React.CSSProperties["borderStyle"] : undefined,
              borderRadius: block.rounded ? 9999 : block.borderRadius,
              opacity:      block.opacity / 100,
            }}
          >
            {block.src ? (
              <img
                src={block.src}
                alt={block.alt || "Image"}
                style={{
                  width: "100%",
                  objectFit:      block.objectFit,
                  objectPosition: block.objectPosition,
                  display: "block",
                }}
              />
            ) : (
              <div className="w-full aspect-video bg-[#F0E9E3] border-2 border-dashed border-[#CDBBAD] rounded-xl flex flex-col items-center justify-center gap-2 text-[#CDBBAD]">
                <span className="text-2xl font-bold">Img</span>
                <span className="text-xs">Set image URL in the right panel</span>
              </div>
            )}
            {/* Color overlay / tint */}
            {block.overlayColor && block.overlayOpacity > 0 && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundColor: block.overlayColor,
                  opacity: block.overlayOpacity / 100,
                }}
              />
            )}
          </div>
          {block.caption && (
            <figcaption
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => set({ caption: e.currentTarget.textContent ?? "" })}
              className="text-center text-xs text-[#899581] mt-2 outline-none focus:bg-blue-50/30 rounded px-1"
            >
              {block.caption}
            </figcaption>
          )}
        </figure>
      );
    }

    // ── Cover ────────────────────────────────────────────────────────────────
    case "cover": {
      const h = { sm: "h-40", md: "h-64", lg: "h-96", full: "h-screen" }[block.height];
      return (
        <div className={`relative ${h} w-full overflow-hidden rounded-xl`}>
          {block.src
            ? <Image src={block.src} alt={block.heading} fill className="object-cover" sizes="100vw" />
            : <div className="absolute inset-0 bg-[#11100E]" />}
          <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${block.overlay/100})` }} />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8 gap-2">
            <h2
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => set({ heading: e.currentTarget.textContent ?? "" })}
              style={{ color: block.textColor }}
              className="text-3xl md:text-5xl font-bold drop-shadow-lg outline-none focus:bg-white/10 rounded px-2"
            >
              {block.heading}
            </h2>
            <p
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => set({ subheading: e.currentTarget.textContent ?? "" })}
              style={{ color: block.textColor, opacity: 0.85 }}
              className="text-lg drop-shadow outline-none focus:bg-white/10 rounded px-2"
            >
              {block.subheading}
            </p>
          </div>
        </div>
      );
    }

    // ── Audio / Video — show placeholder, edit in panel ──────────────────────
    case "audio":
      return (
        <div className="py-2">
          {block.title && <p className="text-sm font-medium text-[#11100E] mb-2">{block.title}</p>}
          {block.src
            ? <audio controls className="w-full" src={block.src} />
            : <div className="w-full h-14 bg-[#F0E9E3] border-2 border-dashed border-[#CDBBAD] rounded-lg flex items-center justify-center text-xs text-[#CDBBAD] gap-2"><span className="font-bold text-base">Au</span>Set audio URL in panel</div>}
        </div>
      );

    case "video":
      return (
        <div className="py-2">
          {block.title && <p className="text-sm font-medium text-[#11100E] mb-2">{block.title}</p>}
          {block.src
            ? block.src.includes("youtube") || block.src.includes("vimeo")
              ? <div className="relative w-full aspect-video rounded-xl overflow-hidden"><iframe src={block.src} title={block.title} className="absolute inset-0 w-full h-full" allowFullScreen /></div>
              : <video controls className="w-full rounded-xl" src={block.src} />
            : <div className="w-full aspect-video bg-[#F0E9E3] border-2 border-dashed border-[#CDBBAD] rounded-xl flex flex-col items-center justify-center gap-2 text-[#CDBBAD]"><span className="text-2xl font-bold">Vid</span><span className="text-xs">Set video URL in panel</span></div>}
        </div>
      );

    // ── Table ────────────────────────────────────────────────────────────────
    case "table":
      return (
        <div className="overflow-x-auto py-2">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-[#F0E9E3]">
                {block.headers.map((h, i) => (
                  <th key={i} className="px-4 py-2.5 border border-[#CDBBAD]/40 font-semibold text-left">
                    <span
                      contentEditable suppressContentEditableWarning
                      onBlur={(e) => { const headers=[...block.headers]; headers[i]=e.currentTarget.textContent??''; set({headers}); }}
                      className="outline-none focus:bg-blue-50/50 rounded px-0.5 text-[#11100E]"
                    >{h}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={ri} className={ri%2===0?"bg-white":"bg-[#F0E9E3]/40"}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-4 py-2.5 border border-[#CDBBAD]/40">
                      <span
                        contentEditable suppressContentEditableWarning
                        onBlur={(e) => { const rows=block.rows.map((r,rj)=>rj===ri?r.map((c,cj)=>cj===ci?e.currentTarget.textContent??'':c):r); set({rows}); }}
                        className="outline-none focus:bg-blue-50/50 rounded px-0.5 text-[#899581]"
                      >{cell}</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "row":
    case "column":
    case "container":
      return (
        <NestedContainerBlock
          block={block as Block & { children: Block[] }}
          onChange={onChange}
        />
      );

    default:
      return null;
  }
}
