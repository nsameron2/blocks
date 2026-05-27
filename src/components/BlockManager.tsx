import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import type { Block as BlockData } from "../types";
import { Block } from "./Block";
import { Muxer } from "./Muxer";

interface BlockManagerProps {
  totalDurationMs: number;
  scheduleStarted: boolean;
}

export function BlockManager({ totalDurationMs, scheduleStarted }: BlockManagerProps) {
  const [blocks, setBlocks] = useState<BlockData[]>([
    {
      id: 1,
      name: "Block",
      color: "bg-gray-500",
      percent: 25,
      emoji: "🆕",
    },
  ]);
  const [nextId, setNextId] = useState(2);
  const [activeBlockId, setActiveBlockId] = useState<number | null>(null);
  const [blockSpent, setBlockSpent] = useState<Record<number, number>>({});
  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;

  useEffect(() => {
    if (scheduleStarted && activeBlockId === null && blocks.length > 0) {
      setActiveBlockId(blocks[0].id);
    }
  }, [scheduleStarted, blocks, activeBlockId]);

  useEffect(() => {
    if (!scheduleStarted || activeBlockId === null) return;
    const timer = setInterval(() => {
      setBlockSpent((prev) => {
        const block = blocksRef.current.find((b) => b.id === activeBlockId);
        if (!block) return prev;
        const allocation = Math.floor(totalDurationMs * (block.percent / 100));
        const currentSpent = prev[activeBlockId] ?? 0;
        if (currentSpent >= allocation) return prev;
        return { ...prev, [activeBlockId]: currentSpent + 1000 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [scheduleStarted, activeBlockId, totalDurationMs]);

  const totalAllocated = blocks.reduce((sum, b) => sum + b.percent, 0);
  const remainingPercent = Math.max(0, 100 - totalAllocated);
  const newBlockPercent = Math.max(0, Math.min(25, remainingPercent));

  function addEmptyBlock() {
    const id = nextId;

    setBlocks((prev) => [
      ...prev,
      { id, name: "Block", color: "bg-gray-500", percent: newBlockPercent, emoji: "🆕" },
    ]);
    setNextId((n) => n + 1);
  }

  function renameBlock(id: number, name: string) {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, name } : b))
    );
  }

  function updateBlockPercent(id: number, percent: number) {
    const othersTotal = blocks
      .filter((b) => b.id !== id)
      .reduce((sum, b) => sum + b.percent, 0);
    const maxAllowed = Math.max(0, 100 - othersTotal);
    const clampedPercent = Math.max(0, Math.min(maxAllowed, percent));
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, percent: clampedPercent } : b))
    );
  }

  function applyBlockPercents(updates: { id: number; percent: number }[]) {
    if (updates.length === 0) return;
    setBlocks((prev) =>
      prev.map((b) => {
        const u = updates.find((x) => x.id === b.id);
        if (u) return { ...b, percent: Math.max(0, Math.min(100, u.percent)) };
        return b;
      })
    );
  }

  function updateBlockColor(id: number, color: string) {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, color } : b))
    );
  }

  function updateBlockEmoji(id: number, emoji: string) {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, emoji } : b))
    );
  }

  function deleteBlock(id: number) {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    setBlockSpent((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (activeBlockId === id) {
      setActiveBlockId(null);
    }
  }

  function resetBlocks() {
    setBlocks([
      {
        id: 1,
        name: "Block",
        color: "bg-gray-500",
        percent: 25,
        emoji: "🆕",
      },
    ]);
    setNextId(2);
    setBlockSpent({});
    setActiveBlockId(null);
  }

  return (
    <section className="max-w-4xl mx-auto mt-16 px-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-white text-xl font-semibold">
          Blocks
        </h2>
        <div className="flex items-center gap-3">
          <button
            onClick={resetBlocks}
            title="Reset blocks"
            className="text-white hover:text-neutral-300 cursor-pointer"
          >
            <RefreshCw size={20} />
          </button>
          <button
            onClick={addEmptyBlock}
            title={"Add block"}
            className="text-white text-2xl hover:text-neutral-300 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-white"
          >
            +
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-4">
        {blocks.map((block) => {
          const othersTotal = totalAllocated - block.percent;
          const maxPercent = Math.max(0, 100 - othersTotal);
          const allocatedMs = scheduleStarted
            ? Math.floor(totalDurationMs * (block.percent / 100))
            : 0;
          const spentMs = blockSpent[block.id] ?? 0;
          const remainingMs = Math.max(0, allocatedMs - spentMs);
          return (
            <Block
              key={block.id}
              block={block}
              isActive={activeBlockId === block.id}
              maxPercent={maxPercent}
              onSelect={() => setActiveBlockId(block.id)}
              onDelete={deleteBlock}
              onNameChange={renameBlock}
              onPercentChange={updateBlockPercent}
              onColorChange={updateBlockColor}
              onEmojiChange={updateBlockEmoji}
              remainingMs={remainingMs}
              allocatedMs={allocatedMs}
            />
          );
        })}
      </div>
      <Muxer blocks={blocks} onApplyPercents={applyBlockPercents} />
    </section>
  );
}
