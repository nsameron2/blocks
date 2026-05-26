import { useState } from "react";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import type { Block as BlockType } from "../types";

const COLOR_OPTIONS = [
  { label: "Gray", value: "bg-gray-500" },
  { label: "Red", value: "bg-red-500" },
  { label: "Blue", value: "bg-blue-500" },
  { label: "Green", value: "bg-green-500" },
  { label: "Yellow", value: "bg-yellow-500" },
  { label: "Purple", value: "bg-purple-500" },
  { label: "Pink", value: "bg-pink-500" },
];

/* Darker ^ colors for slider track fills */
const DARKER_SHADES: Record<string, string> = {
  gray: "rgb(55 65 81)",
  red: "rgb(185 28 28)",
  blue: "rgb(29 78 216)",
  green: "rgb(21 128 61)",
  yellow: "rgb(161 98 7)",
  purple: "rgb(126 34 206)",
  pink: "rgb(190 24 93)",
};

function darkerBlockColor(blockColor: string): string {
  const match = blockColor.match(/^bg-(\w+)-500$/);
  return match ? DARKER_SHADES[match[1]] ?? "rgb(82 82 82)" : "rgb(82 82 82)";
}

interface BlockProps {
  block: BlockType;
  isActive: boolean;
  maxPercent: number;
  onSelect: () => void;
  onDelete: (id: number) => void;
  onNameChange: (id: number, name: string) => void;
  onPercentChange: (id: number, percent: number) => void;
  onColorChange: (id: number, color: string) => void;
  onEmojiChange: (id: number, emoji: string) => void;
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
  onDelete,
  onNameChange,
  onPercentChange,
  onColorChange,
  onEmojiChange,
  remainingMs,
  allocatedMs,
}: BlockProps) {
  const pct = allocatedMs > 0 ? Math.round((remainingMs / allocatedMs) * 100) : 0;
  const [editingPercent, setEditingPercent] = useState(false);
  const [editingColor, setEditingColor] = useState(false);
  const [editingEmoji, setEditingEmoji] = useState(false);
  const isEditingInline = editingPercent || editingColor || editingEmoji;

  return (
    <div
      onClick={() => {
        if (editingPercent) setEditingPercent(false);
        if (editingColor) setEditingColor(false);
        if (editingEmoji) setEditingEmoji(false);
        onSelect();
      }}
      className={`group relative ${block.color} w-64 h-64 rounded-lg cursor-pointer transition-opacity ${
        block.percent === 0 ? "opacity-40 hover:opacity-80" : ""
      } ${
        isActive
          ? "ring-4 ring-blue-400 shadow-[0_0_20px_rgba(96,165,250,0.6)]"
          : ""
      } ` }
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
              block.name.length <= 7
                ? "text-4xl"
                : block.name.length <= 12
                  ? "text-2xl"
                  : block.name.length <= 20
                    ? "text-lg"
                    : "text-md"
            }`}
          />

          <div className="relative shrink-0 ml-2 mt-0.5">
            <span
              onClick={(e) => {
                e.stopPropagation();
                setEditingColor(false);
                setEditingEmoji(false);
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

        <div className={`flex items-center gap-2 transition-opacity ml-0 mt-0.5 ${editingPercent ? 'opacity-0 pointer-events-none' : (editingColor || editingEmoji) ? '' : 'opacity-0 group-hover:opacity-100'}`}>
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditingPercent(false);
              setEditingColor(false);
              setEditingEmoji((prev) => !prev);
            }}
            className="emoji-outline-trigger flex items-center justify-center cursor-pointer p-1 rounded-full transition-colors"
            aria-label="Change emoji"
          >
            <span className="emoji-outline text-xl leading-none">{block.emoji}</span>
          </button>
          {editingEmoji && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute top-full mt-2 z-20 origin-top-left animate-[slide-down_0.15s_ease-out] scale-85"
            >
              <Picker
                data={data}
                theme="dark"
                previewPosition="none"
                skinTonePosition="none"
                navPosition="none"
                onEmojiSelect={(e: { native: string }) => {
                  onEmojiChange(block.id, e.native);
                  setEditingEmoji(false);
                }}
              />
            </div>
          )}
        </div>
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditingPercent(false);
              setEditingEmoji(false);
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

      <span
        className="absolute inset-0 flex items-center justify-center text-8xl opacity-20 pointer-events-none select-none"
        aria-hidden="true"
      >
        {block.emoji}
      </span>

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
