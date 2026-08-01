"use client";

import { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, Save, Plus, Trash2, ChevronUp, ChevronDown, CheckCircle, Globe, FileText } from "lucide-react";
import { getPageById, savePage, BLOCK_META, createPage, BLOCK_DEFAULTS } from "@/lib/cms-store";
import type { CMSPage, Block, RowBlock, ColumnBlock, BlockType } from "@/lib/cms-store";
import BlockPreview from "@/components/admin/BlockPreview";
import InlineBlockEditor from "@/components/admin/InlineBlockEditor";
import ComponentTree from "@/components/admin/ComponentTree";
import FigmaPropertiesPanel from "@/components/admin/FigmaPropertiesPanel";
import AddBlockPanel from "@/components/admin/AddBlockPanel";
import type { SelectionInfo } from "@/components/admin/RichTextEditor";

function uid() { return Math.random().toString(36).slice(2, 10); }

// ── SVG icons for block picker grid ──────────────────────────────────────────
const BLOCK_SVG: Record<string, React.ReactNode> = {
  paragraph: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="3" y1="14" x2="17" y2="14"/><line x1="3" y1="18" x2="13" y2="18"/></svg>,
  heading:   <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 6v12M20 6v12M4 12h16"/></svg>,
  list:      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="4" cy="6" r="1.5" fill="currentColor"/><circle cx="4" cy="12" r="1.5" fill="currentColor"/><circle cx="4" cy="18" r="1.5" fill="currentColor"/></svg>,
  table:     <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="9" x2="9" y2="21"/><line x1="15" y1="9" x2="15" y2="21"/></svg>,
  quote:     <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M6.5 10c-.223 0-.437.034-.65.065.069-.232.14-.468.254-.68.114-.308.292-.575.469-.844.148-.291.409-.488.601-.737.201-.242.475-.403.692-.604.213-.21.492-.315.714-.463.232-.133.434-.28.65-.35l.539-.222-.485-1.938-.597.144c-.191.048-.424.104-.689.171-.271.05-.56.187-.882.312C7.731 3.78 7.196 4.05 6.699 4.42c-.497.344-1.028.814-1.426 1.39-.398.552-.698 1.2-.919 1.953C4.226 8.21 4.144 8.684 4.144 9.166c0 .84.17 1.713.484 2.389.312.677.744 1.213 1.26 1.596.517.382 1.074.579 1.641.579.78 0 1.513-.273 2.062-.757.548-.485.878-1.163.878-1.918 0-.754-.33-1.432-.878-1.916C9.043 8.554 8.311 8.282 7.531 8.282H6.5zm9 0c-.223 0-.437.034-.65.065.069-.232.14-.468.254-.68.114-.308.292-.575.469-.844.148-.291.409-.488.601-.737.201-.242.475-.403.692-.604.213-.21.492-.315.714-.463.232-.133.434-.28.65-.35l.539-.222-.485-1.938-.597.144c-.191.048-.424.104-.689.171-.271.05-.56.187-.882.312-.268.126-.803.396-1.3.766-.497.344-1.028.814-1.426 1.39-.398.552-.698 1.2-.919 1.953-.128.45-.21.924-.21 1.406 0 .84.17 1.713.484 2.389.312.677.744 1.213 1.26 1.596.517.382 1.074.579 1.641.579.78 0 1.513-.273 2.062-.757.548-.485.878-1.163.878-1.918 0-.754-.33-1.432-.878-1.916-.55-.485-1.282-.757-2.062-.757H15.5z"/></svg>,
  code:      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>,
  image:     <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  cover:     <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 14l5-5 4 4 3-3 5 4"/></svg>,
  audio:     <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>,
  video:     <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="4" width="16" height="16" rx="2"/><polygon points="22 8 22 16 16 12" fill="currentColor" stroke="none"/></svg>,
  button:    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="8" width="18" height="8" rx="4"/><line x1="9" y1="12" x2="15" y2="12"/></svg>,
  row:       <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="2"  y="5" width="6" height="14" rx="1.5" opacity=".9"/><rect x="9"  y="5" width="6" height="14" rx="1.5" opacity=".6"/><rect x="16" y="5" width="6" height="14" rx="1.5" opacity=".3"/></svg>,
  column:    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="2"  width="18" height="5.5" rx="1.5" opacity=".9"/><rect x="3" y="9"  width="18" height="5.5" rx="1.5" opacity=".6"/><rect x="3" y="16" width="18" height="5.5" rx="1.5" opacity=".3"/></svg>,
  container: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="3"/><line x1="3" y1="9" x2="21" y2="9" strokeDasharray="2 2"/></svg>,
};

const PICKER_GROUPS: { label: string; types: BlockType[] }[] = [
  { label: "Text",   types: ["paragraph","heading","list","table","quote","code"] },
  { label: "Media",  types: ["image","cover","audio","video"] },
  { label: "Layout", types: ["button","row","column","container"] },
];

function BlockPickerModal({ onPick, onPickLayout, onClose }: {
  onPick: (b: Block) => void;
  onPickLayout?: (type: "row" | "column" | "container") => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-[480px] max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#CDBBAD]/40">
          <h3 className="font-bold text-[#11100E] text-sm">Add a Block</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-[#F0E9E3] hover:bg-[#CDBBAD]/50 flex items-center justify-center text-[#899581] hover:text-[#11100E]">×</button>
        </div>
        <div className="p-5 space-y-5">
          {PICKER_GROUPS.map((g) => (
            <div key={g.label}>
              <p className="text-[10px] font-bold text-[#899581] uppercase tracking-widest mb-3">{g.label}</p>
              <div className="grid grid-cols-4 gap-2">
                {g.types.map((type) => {
                  const meta = BLOCK_META[type];
                  const isLayout = type === "row" || type === "column" || type === "container";
                  return (
                    <button key={type}
                      onClick={() => {
                        if (isLayout && onPickLayout) {
                          onPickLayout(type as "row" | "column");
                        } else {
                          onPick(BLOCK_DEFAULTS[type]());
                        }
                        onClose();
                      }}
                      className="group flex flex-col items-center gap-2 p-3 rounded-xl border-2 border-[#CDBBAD]/40 hover:border-[#5D1C34] hover:bg-[#5D1C34]/5 transition-all">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors
                        ${isLayout ? "bg-[#5D1C34]/10 group-hover:bg-[#5D1C34]/20 text-[#5D1C34]" : "bg-[#F0E9E3] group-hover:bg-[#5D1C34]/10 text-[#899581] group-hover:text-[#5D1C34]"}`}>
                        {BLOCK_SVG[type] ?? <span className="text-xs font-bold">{meta.icon}</span>}
                      </div>
                      <span className="text-[10px] font-medium text-[#899581] group-hover:text-[#5D1C34] text-center leading-tight">{meta.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AddLayoutBar({ onAdd }: { onAdd: (type: "row" | "column") => void }) {
  return (
    <div className="border-2 border-dashed border-[#CDBBAD] rounded-xl p-6 flex flex-col items-center justify-center min-h-40">
      <p className="text-xs text-[#899581] mb-4 font-medium">Add Layout</p>
      <div className="inline-flex gap-3 border border-dashed border-[#CDBBAD] rounded-lg p-3">
        <button onClick={() => onAdd("column")} title="Column"
          className="group w-20 h-20 border border-dashed border-[#CDBBAD] rounded-lg hover:border-[#5D1C34] hover:bg-[#F0E9E3]/60 transition-all flex flex-col items-center justify-center gap-2">
          <div className="flex flex-col gap-1">{[0,1,2].map(i=><div key={i} className="w-10 h-2 rounded-sm bg-[#CDBBAD] group-hover:bg-[#5D1C34]/50 transition-colors"/>)}</div>
          <span className="text-[9px] text-[#CDBBAD] group-hover:text-[#5D1C34] font-medium tracking-wide uppercase">Column</span>
        </button>
        <button onClick={() => onAdd("row")} title="Row"
          className="group w-28 h-20 border border-dashed border-[#CDBBAD] rounded-lg hover:border-[#A67D45] hover:bg-[#F0E9E3]/60 transition-all flex flex-col items-center justify-center gap-2">
          <div className="flex gap-1.5">{[0,1].map(i=>(
            <div key={i} className="w-9 h-8 rounded-sm border border-dashed border-[#CDBBAD] group-hover:border-[#A67D45] transition-colors flex flex-col justify-center gap-1 px-1">
              {[0,1,2].map(j=><div key={j} className="w-full h-1 rounded-sm bg-[#CDBBAD] group-hover:bg-[#A67D45]/50 transition-colors"/>)}
            </div>
          ))}</div>
          <span className="text-[9px] text-[#CDBBAD] group-hover:text-[#A67D45] font-medium tracking-wide uppercase">Row</span>
        </button>
      </div>
    </div>
  );
}

// ── Container block (row/column) rendered on canvas ──────────────────────────
function ContainerBlock({ block, isSelected, idx, totalBlocks, onSelect, onDelete, onMove,
  onAddChild, onUpdateChild, selectedId, onSelectBlock }: {
  block: RowBlock | ColumnBlock | import("@/lib/cms-store").ContainerBlock; isSelected: boolean; idx: number; totalBlocks: number;
  onSelect: () => void; onDelete: () => void; onMove: (d: "up"|"down") => void;
  onAddChild: (cid: string, child: Block) => void;
  onUpdateChild: (cid: string, updated: Block) => void;
  selectedId: string | null; onSelectBlock: (id: string) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const isRow = block.type === "row";
  const borderSel   = isRow ? "border-[#A67D45] shadow-md" : "border-[#5D1C34] shadow-md";
  const borderHover = isRow ? "hover:border-[#A67D45]/50" : "hover:border-[#5D1C34]/50";
  const labelBg     = isRow ? "bg-[#A67D45]" : "bg-[#5D1C34]";

  return (
    <div className={`group relative rounded-xl border-2 transition-all ${isSelected ? borderSel : "border-[#CDBBAD]/50 " + borderHover}`}
      onClick={onSelect}>
      {/* Label */}
      <div className={`absolute top-0 left-0 z-10 px-2 py-0.5 rounded-br-lg text-[10px] font-bold text-white ${labelBg} ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"} transition-opacity`}>
        {block.type === "row" ? "Row" : "Column"}
      </div>
      {/* Controls */}
      <div className={`absolute top-1 right-1 z-10 flex gap-1 ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"} transition-opacity`}>
        <button onClick={(e)=>{e.stopPropagation();onMove("up");}} disabled={idx===0} className="p-1 bg-white rounded shadow text-[#899581] hover:text-[#11100E] disabled:opacity-30"><ChevronUp size={13}/></button>
        <button onClick={(e)=>{e.stopPropagation();onMove("down");}} disabled={idx===totalBlocks-1} className="p-1 bg-white rounded shadow text-[#899581] hover:text-[#11100E] disabled:opacity-30"><ChevronDown size={13}/></button>
        <button onClick={(e)=>{e.stopPropagation();onDelete();}} className="p-1 bg-white rounded shadow text-red-400 hover:text-red-600"><Trash2 size={13}/></button>
      </div>
      {/* Children */}
      <div className={`relative p-3 pt-6 bg-white rounded-xl ${isRow ? "flex gap-3 items-stretch min-h-20" : "flex flex-col gap-3 min-h-20"}`} onClick={(e)=>e.stopPropagation()}>
        {block.children.map((child) => {
          const childSel = selectedId === child.id;
          const isChildContainer = child.type === "row" || child.type === "column" || child.type === "container";
          return (
            <div key={child.id}
              className={`relative rounded-lg border-2 transition-all cursor-pointer ${isRow ? "flex-1 min-w-0" : "w-full"} ${childSel ? "border-[#5D1C34]" : "border-[#CDBBAD]/40 hover:border-[#CDBBAD]"}`}
              onClick={()=>onSelectBlock(child.id)}>
              <div className={`absolute top-0 left-0 z-10 px-1.5 py-0.5 rounded-br-lg text-[9px] font-medium ${childSel ? "bg-[#5D1C34] text-white opacity-100" : "bg-[#CDBBAD]/60 text-[#11100E] opacity-0 group-hover:opacity-100"} transition-opacity`}>
                {BLOCK_META[child.type].label}
              </div>
              {childSel && (
                <button onClick={(e)=>{e.stopPropagation();
                  onUpdateChild(block.id, {...block, children: block.children.filter(c=>c.id!==child.id)} as unknown as Block);
                  onSelectBlock(block.id);
                }} className="absolute top-1 right-1 z-10 p-0.5 bg-white rounded shadow text-red-400 hover:text-red-600">
                  <Trash2 size={11}/>
                </button>
              )}
              <div className="p-2 pt-4" onClick={(e)=>e.stopPropagation()}>
                <InlineBlockEditor
                  block={child}
                  onChange={(updated) => onUpdateChild(block.id, {
                    ...block,
                    children: block.children.map(c => c.id === updated.id ? updated : c)
                  } as unknown as Block)}
                />
              </div>
            </div>
          );
        })}

        {/* Empty state — centered icon when no children */}
        {block.children.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 py-6 cursor-pointer"
            onClick={(e)=>{e.stopPropagation();setPickerOpen(true);}}>
            <div className="w-10 h-10 rounded-full border-2 border-dashed border-[#CDBBAD] hover:border-[#5D1C34] flex items-center justify-center text-[#CDBBAD] hover:text-[#5D1C34] transition-all">
              <Plus size={20} strokeWidth={1.8}/>
            </div>
            <span className="text-[10px] text-[#CDBBAD]">
              {block.type === "container" ? "Empty Container" : isRow ? "Empty Row" : "Empty Column"}
            </span>
          </div>
        )}

        {/* Row: + button inline at end */}
        {isRow && block.children.length > 0 && (
          <div className="flex items-center justify-center min-w-[52px]">
            <button onClick={(e)=>{e.stopPropagation();setPickerOpen(true);}}
              className="w-10 h-10 rounded-full bg-white border-2 border-dashed border-[#CDBBAD] hover:border-[#5D1C34] hover:bg-[#5D1C34]/5 flex items-center justify-center text-[#CDBBAD] hover:text-[#5D1C34] transition-all shadow-sm"
              title="Add block">
              <Plus size={18} strokeWidth={1.8}/>
            </button>
          </div>
        )}

        {/* Column/Container: + button at bottom-right corner */}
        {!isRow && block.children.length > 0 && (
          <div className="flex justify-end pt-1">
            <button onClick={(e)=>{e.stopPropagation();setPickerOpen(true);}}
              className="w-9 h-9 rounded-full bg-white border-2 border-dashed border-[#CDBBAD] hover:border-[#5D1C34] hover:bg-[#5D1C34]/5 flex items-center justify-center text-[#CDBBAD] hover:text-[#5D1C34] transition-all shadow-sm"
              title="Add block">
              <Plus size={16} strokeWidth={1.8}/>
            </button>
          </div>
        )}
      </div>
      {pickerOpen && <BlockPickerModal
        onPick={(b)=>{onAddChild(block.id,b);setPickerOpen(false);}}
        onPickLayout={(type)=>{
          const nested: Block = type === 'container'
            ? BLOCK_DEFAULTS["container"]()
            : BLOCK_DEFAULTS[type]();
          onAddChild(block.id, nested);
          setPickerOpen(false);
        }}
        onClose={()=>setPickerOpen(false)}/>}
    </div>
  );
}

// ── Main page builder ─────────────────────────────────────────────────────────
export default function PageBuilderPage() {
  const { id } = useParams();
  const router = useRouter();
  const initial = getPageById(id as string);

  const [page, setPage]               = useState<CMSPage | null>(initial ? {...initial, blocks: JSON.parse(JSON.stringify(initial.blocks))} : null);
  const [selectedId, setSelectedId]   = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [saved, setSaved]             = useState(false);
  const [saving, setSaving]           = useState(false);
  const [selection, setSelection]     = useState<SelectionInfo | null>(null);

  // Find selected block (top-level or inside any container)
  const findBlock = useCallback((blocks: Block[], id: string): Block | null => {
    for (const b of blocks) {
      if (b.id === id) return b;
      if (b.type === "row" || b.type === "column" || b.type === "container") {
        const found = findBlock((b as RowBlock | ColumnBlock | import("@/lib/cms-store").ContainerBlock).children, id);
        if (found) return found;
      }
    }
    return null;
  }, []);

  const selectedBlock = page ? findBlock(page.blocks, selectedId ?? "") : null;

  const updateBlock = useCallback((updated: Block) => {
    setPage((p) => {
      if (!p) return p;
      const replaceInBlocks = (blocks: Block[]): Block[] =>
        blocks.map((b) => {
          if (b.id === updated.id) return updated;
          if (b.type === "row" || b.type === "column" || b.type === "container") {
            const c = b as RowBlock | ColumnBlock | import("@/lib/cms-store").ContainerBlock;
            return { ...c, children: replaceInBlocks(c.children) };
          }
          return b;
        });
      return { ...p, blocks: replaceInBlocks(p.blocks) };
    });
  }, []);

  const deleteBlock = (id: string) => {
    setPage((p) => {
      if (!p) return p;
      const removeFromBlocks = (blocks: Block[]): Block[] =>
        blocks.filter((b) => b.id !== id).map((b) => {
          if (b.type === "row" || b.type === "column" || b.type === "container") {
            const c = b as RowBlock | ColumnBlock | import("@/lib/cms-store").ContainerBlock;
            return { ...c, children: removeFromBlocks(c.children) };
          }
          return b;
        });
      return { ...p, blocks: removeFromBlocks(p.blocks) };
    });
    setSelectedId(null);
  };

  const moveBlock = (id: string, dir: "up" | "down") => {
    setPage((p) => {
      if (!p) return p;
      const blocks = [...p.blocks];
      const idx = blocks.findIndex((b) => b.id === id);
      if (idx < 0) return p;
      if (dir === "up" && idx === 0) return p;
      if (dir === "down" && idx === blocks.length - 1) return p;
      const swap = dir === "up" ? idx - 1 : idx + 1;
      [blocks[idx], blocks[swap]] = [blocks[swap], blocks[idx]];
      return { ...p, blocks };
    });
  };

  const addChildToContainer = (containerId: string, child: Block) => {
    setPage((p) => {
      if (!p) return p;
      const addInBlocks = (blocks: Block[]): Block[] =>
        blocks.map((b) => {
          if (b.id === containerId) {
            const c = b as RowBlock | ColumnBlock | import("@/lib/cms-store").ContainerBlock;
            return { ...c, children: [...c.children, child] };
          }
          if (b.type === "row" || b.type === "column" || b.type === "container") {
            const c = b as RowBlock | ColumnBlock | import("@/lib/cms-store").ContainerBlock;
            return { ...c, children: addInBlocks(c.children) };
          }
          return b;
        });
      return { ...p, blocks: addInBlocks(p.blocks) };
    });
    setSelectedId(child.id);
  };

  const updateContainerBlock = (containerId: string, updated: Block) => {
    setPage((p) => p ? { ...p, blocks: p.blocks.map((b) => b.id === containerId ? updated : b) } : p);
  };

  const createLayout = (type: "row" | "column" | "container") => {
    const container: Block = type === 'container'
      ? BLOCK_DEFAULTS["container"]()
      : BLOCK_DEFAULTS[type]();
    setPage((p) => p ? { ...p, blocks: [...p.blocks, container] } : p);
    setSelectedId(container.id);
  };

  const addBlock = (blocks: Block[], layout: "row" | "column") => {
    if (blocks.length === 1) {
      setPage((p) => p ? { ...p, blocks: [...p.blocks, blocks[0]] } : p);
      setSelectedId(blocks[0].id);
    } else {
      const container: Block = { id: uid(), type: layout, children: blocks } as Block;
      setPage((p) => p ? { ...p, blocks: [...p.blocks, container] } : p);
      setSelectedId(container.id);
    }
  };

  const handleSave = async () => {
    if (!page) return;
    setSaving(true);
    // Save to local in-memory store
    savePage(page);
    // Also persist to API if available
    try {
      await fetch(`/api/cms/pages/${page.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: page.title, slug: page.slug, status: page.status, blocks: page.blocks }),
      });
    } catch { /* API may not be running — local store still updated */ }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (!page) {
    return (
      <div className="text-center py-20">
        <p className="text-[#899581] mb-3">Page not found.</p>
        <button onClick={() => setPage(createPage())} className="text-[#5D1C34] text-sm hover:underline mr-4">Create blank page</button>
        <Link href="/admin/pages" className="text-[#899581] text-sm hover:underline">← Back</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full -m-4 md:-m-6">
      {/* ── Top bar ── */}
      <header className="flex items-center gap-3 px-4 py-2.5 bg-white border-b border-[#CDBBAD]/50 flex-shrink-0">
        <button onClick={() => router.push("/admin/pages")} className="p-1.5 rounded-lg text-[#899581] hover:bg-[#F0E9E3]"><ArrowLeft size={16}/></button>
        <div className="flex-1 min-w-0">
          <input value={page.title} onChange={(e) => setPage((p) => p ? {...p, title: e.target.value} : p)}
            className="text-sm font-bold text-[#11100E] bg-transparent border-b border-transparent hover:border-[#CDBBAD] focus:border-[#5D1C34] focus:outline-none w-48"/>
          <input value={page.slug} onChange={(e) => setPage((p) => p ? {...p, slug: e.target.value} : p)}
            className="ml-2 text-xs font-mono text-[#899581] bg-transparent border-b border-transparent hover:border-[#CDBBAD] focus:border-[#5D1C34] focus:outline-none w-36"/>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          {saved && <span className="flex items-center gap-1 text-green-600 text-xs font-medium"><CheckCircle size={13}/> Saved</span>}
          <button onClick={() => setPage((p) => p ? {...p, status: p.status === "published" ? "draft" : "published"} : p)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${page.status === "published" ? "bg-green-100 text-green-700 border-green-200" : "bg-amber-100 text-amber-700 border-amber-200"}`}>
            {page.status === "published" ? <Globe size={13}/> : <FileText size={13}/>}
            {page.status === "published" ? "Published" : "Draft"}
          </button>
          <button onClick={() => setShowPreview((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#CDBBAD] text-[#899581] hover:bg-[#F0E9E3]">
            {showPreview ? <EyeOff size={13}/> : <Eye size={13}/>} {showPreview ? "Edit" : "Preview"}
          </button>
          {!showPreview && (
            <button onClick={() => setShowAddPanel((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#5D1C34] text-[#5D1C34] hover:bg-[#5D1C34]/5">
              <Plus size={13}/> Add Block
            </button>
          )}
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#5D1C34] text-white hover:bg-[#4a1628] disabled:opacity-60">
            <Save size={13}/> {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </header>

      {/* ── 3-panel body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT: Component Tree */}
        {!showPreview && (
          <ComponentTree
            blocks={page.blocks}
            selectedId={selectedId}
            onSelect={(id) => { setSelectedId(id); setSelection(null); }}
          />
        )}

        {/* CENTER: Canvas */}
        <div className={`flex-1 overflow-y-auto ${showPreview ? "" : "bg-[#F0E9E3] p-4"}`}>
          {showPreview ? (
            <div className="bg-white min-h-full">
              <div className="max-w-4xl mx-auto px-6 py-8">
                {page.blocks.map((b) => <BlockPreview key={b.id} block={b}/>)}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-3">
              {page.blocks.map((block, idx) => {
                const isContainer = block.type === "row" || block.type === "column" || block.type === "container";
                const isSelected  = selectedId === block.id;

                if (isContainer) {
                  return (
                    <ContainerBlock
                      key={block.id}
                      block={block as RowBlock | ColumnBlock}
                      isSelected={isSelected}
                      idx={idx}
                      totalBlocks={page.blocks.length}
                      onSelect={() => { setSelectedId(block.id); setSelection(null); }}
                      onDelete={() => deleteBlock(block.id)}
                      onMove={(d) => moveBlock(block.id, d)}
                      onAddChild={addChildToContainer}
                      onUpdateChild={(cid, updated) => updateContainerBlock(cid, updated)}
                      selectedId={selectedId}
                      onSelectBlock={(id) => { setSelectedId(id); setSelection(null); }}
                    />
                  );
                }

                const meta = BLOCK_META[block.type];
                return (
                  <div key={block.id} onClick={() => { setSelectedId(block.id); setSelection(null); }}
                    className={`group relative rounded-xl border-2 cursor-pointer transition-all overflow-hidden ${isSelected ? "border-[#5D1C34] shadow-md" : "border-transparent hover:border-[#CDBBAD]"}`}>
                    <div className={`absolute top-0 left-0 z-10 flex items-center gap-1 px-2 py-0.5 rounded-br-lg text-[10px] font-medium transition-opacity ${isSelected ? "bg-[#5D1C34] text-white opacity-100" : "bg-[#CDBBAD]/70 text-[#11100E] opacity-0 group-hover:opacity-100"}`}>
                      <span>{meta.icon}</span> {meta.label}
                    </div>
                    <div className={`absolute top-1 right-1 z-10 flex gap-1 ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"} transition-opacity`}>
                      <button onClick={(e)=>{e.stopPropagation();moveBlock(block.id,"up");}} disabled={idx===0} className="p-1 bg-white rounded shadow text-[#899581] hover:text-[#11100E] disabled:opacity-30"><ChevronUp size={13}/></button>
                      <button onClick={(e)=>{e.stopPropagation();moveBlock(block.id,"down");}} disabled={idx===page.blocks.length-1} className="p-1 bg-white rounded shadow text-[#899581] hover:text-[#11100E] disabled:opacity-30"><ChevronDown size={13}/></button>
                      <button onClick={(e)=>{e.stopPropagation();deleteBlock(block.id);}} className="p-1 bg-white rounded shadow text-red-400 hover:text-red-600"><Trash2 size={13}/></button>
                    </div>
                    <div className="p-3 bg-white" onClick={(e)=>e.stopPropagation()}>
                      <InlineBlockEditor block={block} onChange={updateBlock}
                        onSelectionChange={(info) => { if (block.id === selectedId) setSelection(info); }}/>
                    </div>
                  </div>
                );
              })}
              <AddLayoutBar onAdd={createLayout}/>
            </div>
          )}
        </div>

        {/* RIGHT: Figma Properties Panel */}
        {!showPreview && selectedBlock && (
          <FigmaPropertiesPanel
            block={selectedBlock}
            onChange={updateBlock}
            selection={selection}
            onDelete={() => deleteBlock(selectedBlock.id)}
          />
        )}

        {/* Add Block side panel (from top bar button) */}
        {!showPreview && showAddPanel && (
          <AddBlockPanel onAdd={addBlock} onClose={() => setShowAddPanel(false)}/>
        )}
      </div>
    </div>
  );
}
