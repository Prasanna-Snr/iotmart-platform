"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown, Layers } from "lucide-react";
import type { Block } from "@/lib/cms-store";
import { BLOCK_META } from "@/lib/cms-store";

interface Props {
  blocks: Block[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

// SVG icon per block type — small 14×14
function BlockIcon({ type }: { type: string }) {
  const icons: Record<string, React.ReactNode> = {
    row:       <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="5" width="6" height="14" rx="1" opacity=".9"/><rect x="9" y="5" width="6" height="14" rx="1" opacity=".6"/><rect x="16" y="5" width="6" height="14" rx="1" opacity=".3"/></svg>,
    column:    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="2" width="18" height="5" rx="1" opacity=".9"/><rect x="3" y="9" width="18" height="5" rx="1" opacity=".6"/><rect x="3" y="16" width="18" height="5" rx="1" opacity=".3"/></svg>,
    paragraph: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="3" y1="14" x2="17" y2="14"/><line x1="3" y1="18" x2="13" y2="18"/></svg>,
    heading:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 6v12M20 6v12M4 12h16"/></svg>,
    list:      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="4" cy="6" r="1.5" fill="currentColor"/><circle cx="4" cy="12" r="1.5" fill="currentColor"/><circle cx="4" cy="18" r="1.5" fill="currentColor"/></svg>,
    table:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="9" x2="9" y2="21"/><line x1="15" y1="9" x2="15" y2="21"/></svg>,
    quote:     <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6.5 10c-.223 0-.437.034-.65.065.069-.232.14-.468.254-.68.114-.308.292-.575.469-.844.148-.291.409-.488.601-.737.201-.242.475-.403.692-.604.213-.21.492-.315.714-.463.232-.133.434-.28.65-.35l.539-.222.474-.197-.485-1.938-.597.144c-.191.048-.424.104-.689.171-.271.05-.56.187-.882.312C7.731 3.78 7.196 4.05 6.699 4.42c-.497.344-1.028.814-1.426 1.39-.398.552-.698 1.2-.919 1.953-.128.45-.21.924-.21 1.406 0 .84.17 1.713.484 2.389.312.677.744 1.213 1.26 1.596.517.382 1.074.579 1.641.579.78 0 1.513-.273 2.062-.757.548-.485.878-1.163.878-1.918 0-.754-.33-1.432-.878-1.916-.55-.485-1.282-.757-2.062-.757H6.5zm9 0c-.223 0-.437.034-.65.065.069-.232.14-.468.254-.68.114-.308.292-.575.469-.844.148-.291.409-.488.601-.737.201-.242.475-.403.692-.604.213-.21.492-.315.714-.463.232-.133.434-.28.65-.35l.539-.222.474-.197-.485-1.938-.597.144c-.191.048-.424.104-.689.171-.271.05-.56.187-.882.312-.268.126-.803.396-1.3.766-.497.344-1.028.814-1.426 1.39-.398.552-.698 1.2-.919 1.953-.128.45-.21.924-.21 1.406 0 .84.17 1.713.484 2.389.312.677.744 1.213 1.26 1.596.517.382 1.074.579 1.641.579.78 0 1.513-.273 2.062-.757.548-.485.878-1.163.878-1.918 0-.754-.33-1.432-.878-1.916-.55-.485-1.282-.757-2.062-.757H15.5z"/></svg>,
    code:      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>,
    image:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
    cover:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 14l5-5 4 4 3-3 5 4"/></svg>,
    audio:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>,
    video:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="16" height="16" rx="2"/><polygon points="22 8 22 16 16 12" fill="currentColor"/></svg>,
    button:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="8" width="18" height="8" rx="4"/></svg>,
    container: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="3"/><line x1="3" y1="9" x2="21" y2="9" strokeDasharray="2 2"/></svg>,
  };
  return <span className="flex-shrink-0 text-current">{icons[type] ?? <span className="text-[9px] font-bold">{type.slice(0,2).toUpperCase()}</span>}</span>;
}

interface TreeNodeProps {
  block: Block;
  depth: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  index: number;
  total: number;
}

function TreeNode({ block, depth, selectedId, onSelect, index, total }: TreeNodeProps) {
  const isContainer = block.type === "row" || block.type === "column" || block.type === "container";
  const children = isContainer ? (block as { children: Block[] }).children : [];
  const [open, setOpen] = useState(true);
  const isSelected = selectedId === block.id;
  const meta = BLOCK_META[block.type];

  // Get a preview label for the node
  const getLabel = () => {
    switch (block.type) {
      case "heading":   return (block as { text: string }).text?.slice(0, 24) || meta.label;
      case "paragraph": return (block as { content: string }).content?.replace(/<[^>]+>/g, "").slice(0, 24) || meta.label;
      case "button":    return (block as { text: string }).text || meta.label;
      case "image":     return (block as { alt: string }).alt || "Image";
      case "cover":     return (block as { heading: string }).heading?.slice(0, 24) || "Cover";
      case "row":       return `Row (${children.length})`;
      case "column":    return `Column (${children.length})`;
      case "container": return `Container (${children.length})`;
      default:          return meta.label;
    }
  };

  const typeColor: Record<string, string> = {
    row:       "text-[#A67D45]",
    column:    "text-[#5D1C34]",
    container: "text-[#899581]",
  };

  return (
    <div>
      <div
        className={`flex items-center gap-1.5 py-1.5 px-2 rounded-lg cursor-pointer transition-colors group
          ${isSelected ? "bg-[#5D1C34] text-white" : "hover:bg-[#F0E9E3] text-[#11100E]"}`}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
        onClick={() => onSelect(block.id)}
      >
        {/* Expand/collapse for containers */}
        {isContainer ? (
          <button
            onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
            className={`flex-shrink-0 transition-transform ${isSelected ? "text-white" : "text-[#899581]"}`}
          >
            {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
        ) : (
          <span className="w-3 flex-shrink-0" />
        )}

        {/* Icon */}
        <span className={`flex-shrink-0 ${isSelected ? "text-white" : typeColor[block.type] ?? "text-[#899581]"}`}>
          <BlockIcon type={block.type} />
        </span>

        {/* Label */}
        <span className={`text-xs truncate flex-1 ${isSelected ? "text-white font-medium" : "text-[#11100E]"}`}>
          {getLabel()}
        </span>

        {/* Index badge */}
        <span className={`text-[9px] flex-shrink-0 ${isSelected ? "text-white/60" : "text-[#CDBBAD]"}`}>
          {index + 1}
        </span>
      </div>

      {/* Children */}
      {isContainer && open && children.length > 0 && (
        <div>
          {children.map((child, i) => (
            <TreeNode
              key={child.id}
              block={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              index={i}
              total={children.length}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ComponentTree({ blocks, selectedId, onSelect }: Props) {
  return (
    <div className="h-full flex flex-col bg-white border-r border-[#CDBBAD]/50 w-52 flex-shrink-0">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-3 border-b border-[#CDBBAD]/40">
        <Layers size={14} className="text-[#5D1C34]" />
        <h3 className="text-xs font-bold text-[#11100E] uppercase tracking-wider">Structure</h3>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-2 px-1">
        {blocks.length === 0 ? (
          <p className="text-[10px] text-[#CDBBAD] text-center py-6 px-3">
            No blocks yet. Add a layout to start.
          </p>
        ) : (
          blocks.map((block, i) => (
            <TreeNode
              key={block.id}
              block={block}
              depth={0}
              selectedId={selectedId}
              onSelect={onSelect}
              index={i}
              total={blocks.length}
            />
          ))
        )}
      </div>
    </div>
  );
}
