import type { Block as BlockType } from "../types";

interface BlockProps {
  block: BlockType;
  isActive: boolean;
  onSelect: () => void;
  onEdit: () => void;
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
  onEdit,
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
      <div className="absolute top-0 left-0 right-0 flex items-start justify-between px-4 pt-3">
        <span
          className={`text-white font-bold break-words leading-tight line-clamp-2 ${
            block.name.length <= 8
              ? "text-4xl"
              : block.name.length <= 14
                ? "text-2xl"
                : block.name.length <= 22
                  ? "text-xl"
                  : "text-lg"
          }`}
        >
          {block.name}
        </span>
        <span className="text-white text-sm font-bold bg-white/25 rounded-md px-2 py-0.5 transition-opacity group-hover:opacity-0 shrink-0 ml-2 mt-0.5">
          {block.percent}%
        </span>
      </div>

      {allocatedMs > 0 && (
        <div className="absolute bottom-0 left-0 right-0 p-4">
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

      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="text-white bg-black/50 rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/70 cursor-pointer"
          aria-label="Edit block"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
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
          className="text-white bg-black/50 rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/70 cursor-pointer"
          aria-label="Delete block"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
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
  );
}
