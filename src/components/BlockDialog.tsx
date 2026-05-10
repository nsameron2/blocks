import { useState } from "react";

export const COLOR_OPTIONS = [
  { label: "Gray", value: "bg-gray-500" },
  { label: "Red", value: "bg-red-500" },
  { label: "Blue", value: "bg-blue-500" },
  { label: "Green", value: "bg-green-500" },
  { label: "Yellow", value: "bg-yellow-500" },
  { label: "Purple", value: "bg-purple-500" },
  { label: "Pink", value: "bg-pink-500" },
];

interface BlockDialogProps {
  onClose: () => void;
  onSave: (name: string, color: string, percent: number) => void;
  initialData?: { name: string; color: string; percent: number };
  maxPercent?: number;
  title?: string;
}

export function BlockDialog({ onClose, onSave, initialData, maxPercent = 100, title = "Block" }: BlockDialogProps) {
  const [name, setName] = useState(initialData?.name ?? "Block");
  const [color, setColor] = useState(initialData?.color ?? "bg-gray-500");
  const [percent, setPercent] = useState(
    Math.min(initialData?.percent ?? 10, maxPercent)
  );

  function handleSave() {
    if (!name.trim()) return;
    onSave(name.trim(), color, percent);
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-neutral-800 rounded-xl p-6 w-96 shadow-xl">
        <h3 className="text-white text-xl font-semibold mb-4">{title}</h3>

        <label className="block text-white text-sm mb-1">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Block name"
          className="w-full bg-neutral-700 text-white rounded px-3 py-2 border border-neutral-600 focus:outline-none focus:border-neutral-400 mb-4"
        />

        <label className="block text-white text-sm mb-1">Color</label>
        <div className="flex gap-2 mb-4">
          {COLOR_OPTIONS.map((c) => (
            <button
              key={c.value}
              onClick={() => setColor(c.value)}
              className={`w-8 h-8 rounded-full ${c.value} cursor-pointer ${color === c.value ? "ring-2 ring-white" : ""}`}
              title={c.label}
            />
          ))}
        </div>

        <label className="block text-white text-sm mb-1">
          Percent of time: {percent}%
        </label>
        <div
          className="relative w-full h-2 rounded-full mb-6"
          style={{
            background: `linear-gradient(to right, rgb(82 82 82) 0%, rgb(82 82 82) ${maxPercent}%, rgb(70 70 70) ${maxPercent}%, rgb(70 70 70) 100%)`,
          }}
        >
          <input
            type="range"
            min={0}
            max={100}
            value={percent}
            onChange={(e) => setPercent(Math.min(Number(e.target.value), maxPercent))}
            className="slider-clamped absolute inset-0 w-full h-2"
          />
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="text-neutral-300 hover:text-white px-4 py-2 rounded cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="bg-white text-neutral-900 px-4 py-2 rounded font-semibold hover:bg-neutral-200 cursor-pointer"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
