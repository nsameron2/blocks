import { useState } from "react";
import type { Block as BlockType } from "../types";
import { COLOR_OPTIONS, darkerBlockColor } from "./BlockDialog";

interface BlockProps {
  block: BlockType;
  isActive: boolean;
  maxPercent: number;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: (id: number) => void;
  onNameChange: (id: number, name: string) => void;
  onPercentChange: (id: number, percent: number) => void;
  onColorChange: (id: number, color: string) => void;
  remainingMs: number;
  allocatedMs: number;
}

function fmt(ms: number) {
  if (ms <= 0) return "00:00:00";
  const s = Math.floor(ms / 1000) % 60;
  const m = Math.floor(ms / (60 * 1000)) % 60;
  const h = Math.floor(ms / (60 * 60 * 1000));
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function Block({
  block,
  isActive,
  maxPercent,
  onSelect,
  onEdit,
  onDelete,
  onNameChange,
  onPercentChange,
  onColorChange,
  remainingMs,
  allocatedMs,
}: BlockProps) {
  const pct = allocatedMs > 0 ? Math.round((remainingMs / allocatedMs) * 100) : 0;
  const [editingPercent, setEditingPercent] = useState(false);
  const [editingColor, setEditingColor] = useState(false);
  const isEditingInline = editingPercent || editingColor;

  return (
    <div
      onClick={() => {
        if (editingPercent) setEditingPercent(false);
        if (editingColor) setEditingColor(false);
        onSelect();
      }}
      className={`group relative ${block.color} w-64 h-64 rounded-lg cursor-pointer ${
        isActive
          ? "ring-4 ring-blue-400 shadow-[0_0_20px_rgba(96,165,250,0.6)]"
          : ""
      }`}
    >
      <div className="absolute top-0 left-0 right-0 flex flex-col px-4 pt-3">
        <div className="flex items-start justify-between">
          <input
            type="text"
            value={block.name}
            onChange={(e) => onNameChange(block.id, e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className={`bg-transparent border-none focus:outline-none text-white font-bold w-full p-0 transition-opacity ${
              isEditingInline ? 'opacity-30 pointer-events-none' : ''
            } ${
              block.name.length <= 8
                ? "text-4xl"
                : block.name.length <= 14
                  ? "text-2xl"
                  : block.name.length <= 22
                    ? "text-xl"
                    : "text-lg"
            }`}
          />

          <div className="relative shrink-0 ml-2 mt-0.5">
            <span
              onClick={(e) => {
                e.stopPropagation();
                setEditingColor(false);
                setEditingPercent((prev) => !prev);
              }}
              className="text-white text-sm font-bold bg-white/25 rounded-md px-2 py-0.5 cursor-pointer hover:bg-white/40 transition-colors block"
            >
              {block.percent}%
            </span>
            {editingPercent && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute top-full right-0 mt-2 bg-neutral-800/95 rounded-xl p-3 shadow-xl z-20 flex flex-col items-center gap-2 origin-top animate-[slide-down_0.15s_ease-out]"
              >
                <span className="text-white text-xs font-bold">{block.percent}%</span>
                <div
                  className="relative h-28 w-1 rounded-full"
                  style={{
                    background: `linear-gradient(to top, ${darkerBlockColor(block.color)} 0%, ${darkerBlockColor(block.color)} ${maxPercent}%, rgb(38 38 38) ${maxPercent}%, rgb(38 38 38) 100%)`,
                  }}
                >
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={block.percent}
                    onChange={(e) => onPercentChange(block.id, Number(e.target.value))}
                    className="slider-clamped absolute inset-0 h-28 w-1"
                    style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={`flex items-center gap-2 transition-opacity ml-0 mt-0.5 ${editingPercent ? 'opacity-0 pointer-events-none' : editingColor ? '' : 'opacity-0 group-hover:opacity-100'}`}>
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditingPercent(false);
              setEditingColor((prev) => !prev);
            }}
            className={`flex items-center justify-center cursor-pointer p-1.5 rounded-full transition-colors ${editingColor ? 'opacity-0 pointer-events-none' : ''}`}
            aria-label="Change color"
          >
            <div className={`w-4 h-4 rounded-full ${block.color} ring-2 ring-white/60 hover:ring-white transition-all`} />
          </button>
          {editingColor && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute top-0 left-0 bg-neutral-800/95 rounded-full shadow-xl z-20 flex flex-col items-center gap-2 p-1.5 origin-top animate-[slide-down_0.15s_ease-out]"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingColor(false);
                }}
                className="flex items-center justify-center cursor-pointer"
                aria-label="Close color picker"
              >
                <div className={`w-4 h-4 rounded-full ${block.color} ring-2 ring-white`} />
              </button>
              {COLOR_OPTIONS.filter((c) => c.value !== block.color).map((c) => (
                <button
                  key={c.value}
                  onClick={(e) => {
                    e.stopPropagation();
                    onColorChange(block.id, c.value);
                    setEditingColor(false);
                  }}
                  className={`w-4 h-4 rounded-full ${c.value} cursor-pointer transition-transform hover:scale-125`}
                  title={c.label}
                />
              ))}
            </div>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="text-white/70 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
          aria-label="Edit block"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(block.id);
          }}
          className="text-white/70 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
          aria-label="Delete block"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </div>
      </div>

      {allocatedMs > 0 && (
        <div className={`absolute bottom-0 left-0 right-0 p-4 transition-opacity ${isEditingInline ? 'opacity-30 pointer-events-none' : ''}`}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-white text-sm font-bold">{pct}%</span>
            <span className="text-white text-sm font-bold ml-auto">{fmt(remainingMs)}</span>
          </div>
          <div className="h-2 bg-black/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white/80 transition-all duration-1000 ease-linear"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      
    </div>
  );
}
