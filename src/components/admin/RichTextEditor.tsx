"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import type { ParagraphBlock } from "@/lib/cms-store";

export interface SelectionInfo {
  text: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikeThrough: boolean;
  align: string;
}

interface Props {
  block: ParagraphBlock;
  onChange: (updated: ParagraphBlock) => void;
  onSelectionChange?: (info: SelectionInfo | null) => void;
}

function ToolBtn({ onClick, active, title, children }: {
  onClick: () => void; active?: boolean; title: string; children: React.ReactNode;
}) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={`h-7 min-w-[28px] px-1.5 rounded flex items-center justify-center text-xs font-medium transition-colors select-none
        ${active ? "bg-[#5D1C34] text-white" : "text-[#11100E] hover:bg-[#F0E9E3]"}`}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <div className="w-px h-5 bg-[#CDBBAD]/60 mx-0.5 flex-shrink-0" />;
}

const FONT_SIZES: Record<string, string> = { sm: "1", base: "3", lg: "4", xl: "5" };

export default function RichTextEditor({ block, onChange, onSelectionChange }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [fmt, setFmt] = useState<Set<string>>(new Set());

  // Set content ONCE on mount and when block ID changes — never on every keystroke
  const blockIdRef = useRef<string>("");
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    // Only update DOM when switching to a different block (not on content change)
    if (blockIdRef.current !== block.id) {
      blockIdRef.current = block.id;
      el.innerHTML = block.content;
    }
  }, [block.id, block.content]);

  const save = useCallback(() => {
    const el = editorRef.current;
    if (el) onChange({ ...block, content: el.innerHTML });
  }, [block, onChange]);

  const updateFmt = useCallback(() => {
    const f = new Set<string>();
    if (document.queryCommandState("bold"))          f.add("bold");
    if (document.queryCommandState("italic"))        f.add("italic");
    if (document.queryCommandState("underline"))     f.add("underline");
    if (document.queryCommandState("strikeThrough")) f.add("strikeThrough");
    if (document.queryCommandState("justifyLeft"))   f.add("justifyLeft");
    if (document.queryCommandState("justifyCenter")) f.add("justifyCenter");
    if (document.queryCommandState("justifyRight"))  f.add("justifyRight");
    if (document.queryCommandState("justifyFull"))   f.add("justifyFull");
    if (document.queryCommandState("insertOrderedList"))   f.add("ol");
    if (document.queryCommandState("insertUnorderedList")) f.add("ul");
    setFmt(f);

    // Report selection to parent (right panel)
    const sel = window.getSelection();
    const selText = sel?.toString() ?? "";
    if (onSelectionChange) {
      if (selText.trim().length > 0) {
        onSelectionChange({
          text: selText,
          bold: f.has("bold"),
          italic: f.has("italic"),
          underline: f.has("underline"),
          strikeThrough: f.has("strikeThrough"),
          align: f.has("justifyCenter") ? "center" : f.has("justifyRight") ? "right" : f.has("justifyFull") ? "justify" : "left",
        });
      } else {
        onSelectionChange(null);
      }
    }
  }, [onSelectionChange]);

  const exec = useCallback((cmd: string, val?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    updateFmt();
    save();
  }, [save, updateFmt]);

  const wordCount = block.content.replace(/<[^>]+>/g, "").trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="rounded-xl border-2 border-[#CDBBAD]/50 overflow-hidden bg-white focus-within:border-[#5D1C34] transition-colors">

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 bg-[#F0E9E3]/60 border-b border-[#CDBBAD]/50">

        {/* Font size */}
        <select
          value={block.fontSize}
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => {
            const v = e.target.value as ParagraphBlock["fontSize"];
            onChange({ ...block, fontSize: v });
            exec("fontSize", FONT_SIZES[v] ?? "3");
          }}
          className="h-7 text-xs border border-[#CDBBAD] rounded px-1.5 bg-white text-[#11100E] focus:outline-none focus:ring-1 focus:ring-[#5D1C34]/30"
        >
          <option value="sm">Small</option>
          <option value="base">Normal</option>
          <option value="lg">Large</option>
          <option value="xl">X-Large</option>
        </select>

        <Sep />

        {/* Bold / Italic / Underline / Strikethrough */}
        <ToolBtn onClick={() => exec("bold")}          active={fmt.has("bold")}          title="Bold (Ctrl+B)"><strong>B</strong></ToolBtn>
        <ToolBtn onClick={() => exec("italic")}        active={fmt.has("italic")}        title="Italic (Ctrl+I)"><em>I</em></ToolBtn>
        <ToolBtn onClick={() => exec("underline")}     active={fmt.has("underline")}     title="Underline (Ctrl+U)"><span className="underline">U</span></ToolBtn>
        <ToolBtn onClick={() => exec("strikeThrough")} active={fmt.has("strikeThrough")} title="Strikethrough"><span className="line-through">S</span></ToolBtn>

        <Sep />

        {/* Text color */}
        <div className="flex items-center gap-1" title="Text Color">
          <span className="text-[10px] text-[#899581] font-bold">A</span>
          <input
            type="color"
            defaultValue="#11100E"
            onMouseDown={(e) => e.stopPropagation()}
            onChange={(e) => exec("foreColor", e.target.value)}
            className="w-6 h-6 rounded cursor-pointer border border-[#CDBBAD] p-0.5 bg-white"
            title="Text Color"
          />
        </div>

        <Sep />

        {/* Alignment */}
        <ToolBtn onClick={() => exec("justifyLeft")}   active={fmt.has("justifyLeft")}   title="Align Left">
          <svg width="13" height="13" fill="currentColor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="2"/><rect x="3" y="9" width="12" height="2"/><rect x="3" y="14" width="18" height="2"/><rect x="3" y="19" width="12" height="2"/></svg>
        </ToolBtn>
        <ToolBtn onClick={() => exec("justifyCenter")} active={fmt.has("justifyCenter")} title="Align Center">
          <svg width="13" height="13" fill="currentColor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="2"/><rect x="6" y="9" width="12" height="2"/><rect x="3" y="14" width="18" height="2"/><rect x="6" y="19" width="12" height="2"/></svg>
        </ToolBtn>
        <ToolBtn onClick={() => exec("justifyRight")}  active={fmt.has("justifyRight")}  title="Align Right">
          <svg width="13" height="13" fill="currentColor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="2"/><rect x="9" y="9" width="12" height="2"/><rect x="3" y="14" width="18" height="2"/><rect x="9" y="19" width="12" height="2"/></svg>
        </ToolBtn>
        <ToolBtn onClick={() => exec("justifyFull")}   active={fmt.has("justifyFull")}   title="Justify">
          <svg width="13" height="13" fill="currentColor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="2"/><rect x="3" y="9" width="18" height="2"/><rect x="3" y="14" width="18" height="2"/><rect x="3" y="19" width="18" height="2"/></svg>
        </ToolBtn>

        <Sep />

        {/* Lists */}
        <ToolBtn onClick={() => exec("insertUnorderedList")} active={fmt.has("ul")} title="Bullet List">
          <svg width="13" height="13" fill="currentColor" viewBox="0 0 24 24"><circle cx="5" cy="6" r="1.5"/><rect x="9" y="5" width="12" height="2"/><circle cx="5" cy="12" r="1.5"/><rect x="9" y="11" width="12" height="2"/><circle cx="5" cy="18" r="1.5"/><rect x="9" y="17" width="12" height="2"/></svg>
        </ToolBtn>
        <ToolBtn onClick={() => exec("insertOrderedList")} active={fmt.has("ol")} title="Numbered List">
          <svg width="13" height="13" fill="currentColor" viewBox="0 0 24 24"><text x="3" y="8" fontSize="7" fontWeight="bold">1.</text><rect x="10" y="5" width="11" height="2"/><text x="3" y="14" fontSize="7" fontWeight="bold">2.</text><rect x="10" y="11" width="11" height="2"/><text x="3" y="20" fontSize="7" fontWeight="bold">3.</text><rect x="10" y="17" width="11" height="2"/></svg>
        </ToolBtn>
      </div>

      {/* ── Editable area ── */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={save}
        onKeyUp={updateFmt}
        onMouseUp={updateFmt}
        onFocus={updateFmt}
        className="min-h-[100px] px-4 py-3 text-[#11100E] leading-relaxed outline-none
          [&_strong]:font-bold [&_em]:italic [&_u]:underline
          [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5
          [&_li]:mb-0.5
          empty:before:content-[attr(data-placeholder)] empty:before:text-[#CDBBAD]"
        data-placeholder="Write your content here…"
        role="textbox"
        aria-multiline="true"
        aria-label="Paragraph content"
      />

      {/* ── Footer: word count ── */}
      <div className="px-4 py-1 bg-[#F0E9E3]/40 border-t border-[#CDBBAD]/30 flex justify-end">
        <span className="text-[10px] text-[#CDBBAD]">{wordCount} word{wordCount !== 1 ? "s" : ""}</span>
      </div>
    </div>
  );
}
