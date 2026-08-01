"use client";

import { useState } from "react";
import { X, ArrowLeft, Plus, Minus } from "lucide-react";
import { BLOCK_META, BLOCK_DEFAULTS } from "@/lib/cms-store";
import type { Block, BlockType } from "@/lib/cms-store";

interface Props {
  onAdd: (blocks: Block[], layout: "row" | "column") => void;
  onClose: () => void;
}

type Step = "direction" | "slots" | "pick-block";

const BLOCK_GROUPS: { label: string; types: BlockType[] }[] = [
  { label: "Text",   types: ["paragraph", "heading", "list", "table", "quote", "code"] },
  { label: "Media",  types: ["image", "cover", "audio", "video"] },
  { label: "Layout", types: ["button", "container", "row", "column"] },
];

export default function AddBlockPanel({ onAdd, onClose }: Props) {
  const [step, setStep] = useState<Step>("direction");
  const [direction, setDirection] = useState<"row" | "column">("row");
  const [slotCount, setSlotCount] = useState(2);
  const [slots, setSlots] = useState<(Block | null)[]>([null, null]);
  const [activeSlot, setActiveSlot] = useState(0);

  // ── Step 1: pick Row or Column ──
  const handlePickDirection = (dir: "row" | "column") => {
    setDirection(dir);
    const count = dir === "row" ? 2 : 1;
    setSlotCount(count);
    setSlots(new Array(count).fill(null));
    setActiveSlot(0);
    setStep("slots");
  };

  // ── Adjust slot count ──
  const changeSlotCount = (delta: number) => {
    const next = Math.min(Math.max(slotCount + delta, 1), direction === "row" ? 4 : 6);
    setSlotCount(next);
    setSlots((prev) => {
      if (delta > 0) return [...prev, null];
      return prev.slice(0, next);
    });
    if (activeSlot >= next) setActiveSlot(next - 1);
  };

  // ── Pick a block for the active slot ──
  const handlePickBlock = (type: BlockType) => {
    let block: Block;
    if (type === "container") {
      block = BLOCK_DEFAULTS["container"]();
    } else if (type === "row" || type === "column") {
      block = BLOCK_DEFAULTS[type]();
    } else {
      block = BLOCK_DEFAULTS[type]();
    }
    setSlots((prev) => {
      const updated = [...prev];
      updated[activeSlot] = block;
      return updated;
    });
    // auto-advance to next empty slot
    const nextEmpty = slots.findIndex((b, i) => i > activeSlot && b === null);
    if (nextEmpty !== -1) setActiveSlot(nextEmpty);
    setStep("slots");
  };

  const handleInsert = () => {
    const filled = slots.filter((b): b is Block => b !== null);
    if (filled.length === 0) return;
    onAdd(filled, direction);
    onClose();
  };

  const filledCount = slots.filter(Boolean).length;

  return (
    <div className="h-full flex flex-col bg-white border-l border-[#CDBBAD]/50 w-72 flex-shrink-0">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#CDBBAD]/50 flex-shrink-0">
        <div className="flex items-center gap-2">
          {step !== "direction" && (
            <button
              onClick={() => setStep(step === "pick-block" ? "slots" : "direction")}
              className="p-1 rounded text-[#899581] hover:text-[#11100E] hover:bg-[#F0E9E3]"
            >
              <ArrowLeft size={14} />
            </button>
          )}
          <h3 className="font-semibold text-[#11100E] text-sm">
            {step === "direction" && "Add Section"}
            {step === "slots" && `${direction === "row" ? "Row" : "Column"} — ${slotCount} slot${slotCount !== 1 ? "s" : ""}`}
            {step === "pick-block" && `Pick block for slot ${activeSlot + 1}`}
          </h3>
        </div>
        <button onClick={onClose} className="p-1 rounded text-[#899581] hover:text-[#11100E] hover:bg-[#F0E9E3]">
          <X size={16} />
        </button>
      </div>

      {/* Step dots */}
      <div className="flex items-center gap-1.5 px-4 py-2 border-b border-[#CDBBAD]/20 flex-shrink-0">
        {(["direction", "slots", "pick-block"] as Step[]).map((s, i) => (
          <div key={s} className={`h-1.5 rounded-full transition-all ${
            step === s ? "w-6 bg-[#5D1C34]" : "w-3 bg-[#CDBBAD]/50"
          }`} />
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4">

        {/* ── Step 1: Row or Column ── */}
        {step === "direction" && (
          <div className="space-y-3">
            <p className="text-xs text-[#899581] mb-4">
              Choose how blocks are arranged inside this section.
            </p>

            {/* Row */}
            <button
              onClick={() => handlePickDirection("row")}
              className="w-full text-left p-4 rounded-xl border-2 border-[#CDBBAD]/50 hover:border-[#5D1C34] hover:bg-[#F0E9E3]/50 transition-all group"
            >
              {/* Icon: horizontal blocks side by side */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-[#5D1C34]/10 flex items-center justify-center flex-shrink-0">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-[#5D1C34]">
                    <rect x="2"  y="5" width="6" height="14" rx="1.5" fill="currentColor" opacity="0.9"/>
                    <rect x="9"  y="5" width="6" height="14" rx="1.5" fill="currentColor" opacity="0.6"/>
                    <rect x="16" y="5" width="6" height="14" rx="1.5" fill="currentColor" opacity="0.3"/>
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-[#11100E] group-hover:text-[#5D1C34] text-sm">Row</p>
                  <p className="text-xs text-[#899581]">Blocks side by side <strong>horizontally</strong></p>
                </div>
              </div>
              {/* Mini preview */}
              <div className="flex gap-1.5 h-6">
                {[0,1,2].map(i => (
                  <div key={i} className="flex-1 rounded bg-[#5D1C34]/20 border border-[#5D1C34]/20" />
                ))}
              </div>
            </button>

            {/* Column */}
            <button
              onClick={() => handlePickDirection("column")}
              className="w-full text-left p-4 rounded-xl border-2 border-[#CDBBAD]/50 hover:border-[#5D1C34] hover:bg-[#F0E9E3]/50 transition-all group"
            >
              {/* Icon: vertical stacked blocks */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-[#A67D45]/10 flex items-center justify-center flex-shrink-0">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-[#A67D45]">
                    <rect x="3" y="2"  width="18" height="5.5" rx="1.5" fill="currentColor" opacity="0.9"/>
                    <rect x="3" y="9"  width="18" height="5.5" rx="1.5" fill="currentColor" opacity="0.6"/>
                    <rect x="3" y="16" width="18" height="5.5" rx="1.5" fill="currentColor" opacity="0.3"/>
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-[#11100E] group-hover:text-[#5D1C34] text-sm">Column</p>
                  <p className="text-xs text-[#899581]">Blocks stacked <strong>vertically</strong></p>
                </div>
              </div>
              {/* Mini preview */}
              <div className="flex flex-col gap-1.5">
                {[0,1,2].map(i => (
                  <div key={i} className="w-full h-3 rounded bg-[#A67D45]/20 border border-[#A67D45]/20" />
                ))}
              </div>
            </button>
          </div>
        )}

        {/* ── Step 2: Configure slots ── */}
        {step === "slots" && (
          <div className="space-y-4">

            {/* Slot count control */}
            <div className="flex items-center justify-between bg-[#F0E9E3]/60 rounded-lg px-3 py-2">
              <span className="text-xs font-medium text-[#11100E]">
                {direction === "row" ? "Columns" : "Rows"}: {slotCount}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => changeSlotCount(-1)}
                  disabled={slotCount <= 1}
                  className="w-6 h-6 rounded-lg bg-white border border-[#CDBBAD] flex items-center justify-center text-[#899581] hover:text-[#11100E] disabled:opacity-30 transition-colors"
                >
                  <Minus size={11} />
                </button>
                <button
                  onClick={() => changeSlotCount(1)}
                  disabled={slotCount >= (direction === "row" ? 4 : 6)}
                  className="w-6 h-6 rounded-lg bg-white border border-[#CDBBAD] flex items-center justify-center text-[#899581] hover:text-[#11100E] disabled:opacity-30 transition-colors"
                >
                  <Plus size={11} />
                </button>
              </div>
            </div>

            {/* Live layout preview */}
            <div className="rounded-xl border-2 border-[#CDBBAD]/50 p-3 bg-[#F0E9E3]/30">
              <p className="text-xs text-[#899581] mb-2 font-medium">Preview</p>
              <div className={direction === "row" ? "flex gap-2" : "flex flex-col gap-2"}>
                {slots.map((block, i) => (
                  <button
                    key={i}
                    onClick={() => { setActiveSlot(i); setStep("pick-block"); }}
                    className={`flex-1 rounded-lg border-2 transition-all ${
                      activeSlot === i
                        ? "border-[#5D1C34] bg-[#5D1C34]/5"
                        : block
                        ? "border-green-400 bg-green-50"
                        : "border-dashed border-[#CDBBAD] hover:border-[#A67D45] bg-white"
                    } ${direction === "row" ? "h-16" : "h-10"}`}
                  >
                    {block ? (
                      <div className="flex flex-col items-center justify-center h-full gap-0.5">
                        <span className="text-xs font-bold text-green-700">{BLOCK_META[block.type].icon}</span>
                        <span className="text-[10px] text-green-600">{BLOCK_META[block.type].label}</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full gap-0.5">
                        <Plus size={14} className="text-[#CDBBAD]" />
                        <span className="text-[10px] text-[#CDBBAD]">Slot {i + 1}</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-[#899581] mt-2 text-center">
                Click a slot to assign a block
              </p>
            </div>

            {/* Slot list */}
            <div className="space-y-1.5">
              {slots.map((block, i) => (
                <button
                  key={i}
                  onClick={() => { setActiveSlot(i); setStep("pick-block"); }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all text-sm ${
                    block
                      ? "border-green-300 bg-green-50 text-green-800"
                      : "border-[#CDBBAD]/50 hover:border-[#5D1C34] text-[#899581] hover:text-[#11100E]"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${block ? "bg-green-200 text-green-800" : "bg-[#CDBBAD]/30 text-[#899581]"}`}>
                      {i + 1}
                    </span>
                    {block ? (
                      <span className="font-medium">{BLOCK_META[block.type].label}</span>
                    ) : (
                      <span>Empty — click to add block</span>
                    )}
                  </span>
                  {block ? (
                    <span className="text-[10px] text-green-600 font-medium">Change</span>
                  ) : (
                    <Plus size={13} />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 3: Pick block type ── */}
        {step === "pick-block" && (
          <div className="space-y-4">
            <div className="bg-[#F0E9E3]/60 rounded-lg px-3 py-2 flex items-center justify-between">
              <span className="text-xs text-[#899581]">
                Filling slot <span className="font-semibold text-[#5D1C34]">{activeSlot + 1}</span> of {slotCount}
              </span>
              {slots[activeSlot] && (
                <span className="text-[10px] text-green-600 font-medium bg-green-100 px-2 py-0.5 rounded-full">
                  Has: {BLOCK_META[slots[activeSlot]!.type].label}
                </span>
              )}
            </div>
            {BLOCK_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="text-xs font-semibold text-[#899581] uppercase tracking-wider mb-2 px-1">
                  {group.label}
                </p>
                <div className="space-y-1">
                  {group.types.map((type) => {
                    const meta = BLOCK_META[type];
                    return (
                      <button
                        key={type}
                        onClick={() => handlePickBlock(type)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#F0E9E3] text-left transition-colors group"
                      >
                        <span className="w-8 h-8 rounded-lg bg-[#5D1C34]/10 flex items-center justify-center text-xs font-bold flex-shrink-0 text-[#5D1C34]">
                          {meta.icon}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[#11100E] group-hover:text-[#5D1C34]">{meta.label}</p>
                          <p className="text-xs text-[#899581] leading-tight truncate">{meta.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {step === "slots" && (
        <div className="px-4 py-3 border-t border-[#CDBBAD]/50 flex-shrink-0 space-y-2">
          <button
            onClick={handleInsert}
            disabled={filledCount === 0}
            className="w-full bg-[#5D1C34] text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-[#4a1628] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Insert {direction === "row" ? "Row" : "Column"} with {filledCount} block{filledCount !== 1 ? "s" : ""}
          </button>
          {filledCount < slotCount && filledCount > 0 && (
            <p className="text-[10px] text-amber-600 text-center">
              {slotCount - filledCount} empty slot{slotCount - filledCount > 1 ? "s" : ""} will be skipped
            </p>
          )}
        </div>
      )}
    </div>
  );
}
