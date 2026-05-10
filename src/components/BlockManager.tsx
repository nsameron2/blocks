import { useEffect, useState } from "react";
import type { Block as BlockData } from "../types";
import { Block } from "./Block";
import { BlockDialog } from "./BlockDialog";

interface BlockManagerProps {
  totalDurationMs: number;
  scheduleStarted: boolean;
}

export function BlockManager({ totalDurationMs, scheduleStarted }: BlockManagerProps) {
  const [blocks, setBlocks] = useState<BlockData[]>([
    { id: 1, name: "Idle", color: "bg-gray-500", percent: 25 },
  ]);
  const [nextId, setNextId] = useState(2);
  const [editingBlockId, setEditingBlockId] = useState<number | null>(null);
  const [activeBlockId, setActiveBlockId] = useState<number | null>(null);
  const [blockBatteries, setBlockBatteries] = useState<Record<number, number>>({});

  useEffect(() => {
    if (scheduleStarted && activeBlockId === null && blocks.length > 0) {
      setActiveBlockId(blocks[0].id);
    }
  }, [scheduleStarted, blocks, activeBlockId]);

  useEffect(() => {
    if (!scheduleStarted || totalDurationMs <= 0) return;
    const batteries: Record<number, number> = {};
    for (const block of blocks) {
      batteries[block.id] = Math.floor(totalDurationMs * (block.percent / 100));
    }
    setBlockBatteries(batteries);
  }, [scheduleStarted, totalDurationMs]);

  useEffect(() => {
    if (!scheduleStarted || activeBlockId === null) return;
    const timer = setInterval(() => {
      setBlockBatteries((prev) => {
        const current = prev[activeBlockId];
        if (current === undefined || current <= 0) return prev;
        return { ...prev, [activeBlockId]: Math.max(0, current - 1000) };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [scheduleStarted, activeBlockId]);

  const totalAllocated = blocks.reduce((sum, b) => sum + b.percent, 0);
  const remainingPercent = Math.max(0, 100 - totalAllocated);
  const canAdd = remainingPercent >= 25;

  function addEmptyBlock() {
    if (!canAdd) return;
    const id = nextId;

    setBlocks((prev) => [
      ...prev,
      { id, name: "Block", color: "bg-gray-500", percent: 25 },
    ]);
    setNextId((n) => n + 1);

    if (scheduleStarted && totalDurationMs > 0) {
      setBlockBatteries((prev) => ({
        ...prev,
        [id]: Math.floor(totalDurationMs * 0.25),
      }));
    }
  }

  function updateBlock(id: number, name: string, color: string, percent: number) {
    const othersTotal = blocks
      .filter((b) => b.id !== id)
      .reduce((sum, b) => sum + b.percent, 0);
    const maxAllowed = Math.max(0, 100 - othersTotal);
    const clampedPercent = Math.max(0, Math.min(maxAllowed, percent));

    const oldBlock = blocks.find((b) => b.id === id);
    const nextBlocks = blocks.map((b) =>
      b.id === id ? { ...b, name, color, percent: clampedPercent } : b
    );

    setBlocks(nextBlocks);
    setEditingBlockId(null);

    if (scheduleStarted && totalDurationMs > 0 && oldBlock) {
      setBlockBatteries((prev) => {
        const oldAllocation = Math.floor(totalDurationMs * (oldBlock.percent / 100));
        const oldRemaining = prev[id] ?? oldAllocation;
        const spent = Math.max(0, oldAllocation - oldRemaining);
        const newAllocation = Math.floor(totalDurationMs * (clampedPercent / 100));
        return { ...prev, [id]: Math.max(0, newAllocation - spent) };
      });
    }
  }

  function renameBlock(id: number, name: string) {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, name } : b))
    );
  }

  function updateBlockPercent(id: number, percent: number) {
    const block = blocks.find((b) => b.id === id);
    if (!block) return;
    updateBlock(id, block.name, block.color, percent);
  }

  function updateBlockColor(id: number, color: string) {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, color } : b))
    );
  }

  function deleteBlock(id: number) {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    setBlockBatteries((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (activeBlockId === id) {
      setActiveBlockId(null);
    }
  }

  const editingBlock = blocks.find((b) => b.id === editingBlockId);

  return (
    <section className="max-w-4xl mx-auto mt-16 px-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-white text-xl font-semibold">
          Blocks
          <span className="text-neutral-400 text-sm font-normal ml-2">
            ({remainingPercent}% unallocated)
          </span>
        </h2>
        <button
          onClick={addEmptyBlock}
          disabled={!canAdd}
          title={canAdd ? "Add block" : `Need 25%, only ${remainingPercent}% free`}
          className="text-white text-2xl hover:text-neutral-300 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-white"
        >
          +
        </button>
      </div>
      <div className="flex flex-wrap gap-4">
        {blocks.map((block) => {
          const othersTotal = totalAllocated - block.percent;
          const maxPercent = Math.max(0, 100 - othersTotal);
          return (
            <Block
              key={block.id}
              block={block}
              isActive={activeBlockId === block.id}
              maxPercent={maxPercent}
              onSelect={() => setActiveBlockId(block.id)}
              onEdit={() => setEditingBlockId(block.id)}
              onDelete={deleteBlock}
              onNameChange={renameBlock}
              onPercentChange={updateBlockPercent}
              onColorChange={updateBlockColor}
              remainingMs={blockBatteries[block.id] ?? 0}
              allocatedMs={
                scheduleStarted ? Math.floor(totalDurationMs * (block.percent / 100)) : 0
              }
            />
          );
        })}
      </div>

      {editingBlock && (
        <BlockDialog
          onClose={() => setEditingBlockId(null)}
          onSave={(name, color, percent) =>
            updateBlock(editingBlock.id, name, color, percent)
          }
          initialData={{
            name: editingBlock.name,
            color: editingBlock.color,
            percent: editingBlock.percent,
          }}
          maxPercent={Math.max(0, 100 - (totalAllocated - editingBlock.percent))}
          title="Edit Block"
        />
      )}
    </section>
  );
}
