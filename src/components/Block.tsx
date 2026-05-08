import type { Block as BlockType } from "../types";

interface BlockProps {
  block: BlockType;
  isActive: boolean;
  onSelect: () => void;
  onDelete: (id: number) => void;
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
  onSelect,
  onDelete,
  remainingMs,
  allocatedMs,
}: BlockProps) {
  const pct = allocatedMs > 0 ? Math.round((remainingMs / allocatedMs) * 100) : 0;

  return (
    <div
      onClick={onSelect}
      className={`group relative ${block.color} w-64 h-64 rounded-lg cursor-pointer ${
        isActive
          ? "ring-4 ring-blue-400 shadow-[0_0_20px_rgba(96,165,250,0.6)]"
          : ""
      }`}
    >
      <span className="text-white text-xl font-bold pt-4 px-4 block">
        {block.name} - {block.percent}%
      </span>

      {allocatedMs > 0 && (
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-white text-sm font-bold">{pct}%</span>
            <span className="text-white text-xs font-mono">{fmt(remainingMs)}</span>
          </div>
          <div className="h-2 bg-black/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white/80 transition-all duration-1000 ease-linear"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(block.id);
        }}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-white bg-black/50 rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/70 cursor-pointer"
      >
        x
      </button>
    </div>
  );
}
