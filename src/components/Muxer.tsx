import { useRef } from "react";
import type { Block as BlockData } from "../lib/types";

const MIN_DISPLAY_PERCENT = 1;

interface MuxerProps {
  blocks: BlockData[];
  onApplyPercents: (updates: { id: number; percent: number }[]) => void;
}

export function Muxer({ blocks, onApplyPercents }: MuxerProps) {
  const barRef = useRef<HTMLDivElement>(null);

  if (blocks.length === 0) return null;

  // Each block gets at least MIN_DISPLAY_PERCENT visible, even when its
  // real allocation is 0. If the floor forces the sum past 100, scale
  // back so the bar still fits.
  const rawDisplay = blocks.map((b) =>
    Math.max(b.percent, MIN_DISPLAY_PERCENT),
  );
  const sumDisplay = rawDisplay.reduce((a, b) => a + b, 0);
  const displayPercents =
    sumDisplay <= 100
      ? rawDisplay
      : rawDisplay.map((d) => (d * 100) / sumDisplay);

  // Cumulative display position (in %) after each block, used to place
  // handles between adjacent blocks.
  const handles: { leftId: number; rightId: number; position: number }[] = [];
  let cumulative = 0;
  for (let i = 0; i < blocks.length; i++) {
    cumulative += displayPercents[i];
    if (i < blocks.length - 1) {
      handles.push({
        leftId: blocks[i].id,
        rightId: blocks[i + 1].id,
        position: cumulative,
      });
    }
  }

  function onHandleDown(
    e: React.PointerEvent<HTMLDivElement>,
    leftId: number,
    rightId: number,
  ) {
    e.preventDefault();
    const bar = barRef.current;
    if (!bar) return;
    const totalWidth = bar.getBoundingClientRect().width;
    if (totalWidth <= 0) return;
    const startX = e.clientX;
    const left = blocks.find((b) => b.id === leftId);
    const right = blocks.find((b) => b.id === rightId);
    if (!left || !right) return;
    const startLeft = left.percent;
    const startRight = right.percent;
    const pairTotal = startLeft + startRight;

    function onMove(ev: PointerEvent) {
      const dPercent = ((ev.clientX - startX) / totalWidth) * 100;
      const rawLeft = startLeft + dPercent;
      const newLeft = Math.max(0, Math.min(pairTotal, Math.round(rawLeft)));
      const newRight = pairTotal - newLeft;
      onApplyPercents([
        { id: leftId, percent: newLeft },
        { id: rightId, percent: newRight },
      ]);
    }

    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-neutral-950/95 backdrop-blur border-t border-neutral-800 px-6 py-4 z-10">
      <div className="max-w-6xl mx-auto">
        <div ref={barRef} className="relative w-full h-20 select-none">
          <div className="absolute inset-0 rounded-md overflow-hidden bg-neutral-800 flex">
            {blocks.map((block, i) => (
              <div
                key={block.id}
                className={`relative h-full ${block.color} flex items-center justify-center overflow-hidden transition-opacity ${
                  block.percent === 0 ? "opacity-40" : ""
                }`}
                style={{ width: `${displayPercents[i]}%` }}
                title={`${block.name}: ${block.percent}%`}
              >
                <span className="text-3xl opacity-30 pointer-events-none select-none">
                  {block.emoji}
                </span>
              </div>
            ))}
          </div>
          {handles.map((h) => (
            <div
              key={`${h.leftId}-${h.rightId}`}
              onPointerDown={(e) => onHandleDown(e, h.leftId, h.rightId)}
              className="absolute top-0 bottom-0 w-5 -ml-2.5 cursor-ew-resize flex items-center justify-center group touch-none z-10"
              style={{ left: `${h.position}%` }}
              aria-label="Drag to redistribute"
              role="separator"
            >
              <div className="w-1.5 h-full bg-black/80 group-hover:bg-black/30 ring-1 ring-black/70 transition-colors" />
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}
