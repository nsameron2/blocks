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

  function addEmptyBlock() {
    const id = nextId;
    const currentTotal = blocks.reduce((sum, b) => sum + b.percent, 0);

    let nextBlocks = [...blocks];
    let newPercent: number;

    if (currentTotal >= 100) {
      const currentCount = blocks.length;
      newPercent = Math.floor(100 / currentCount);
      const targetExistingTotal = 100 - newPercent;

      nextBlocks = nextBlocks.map((b) => ({
        ...b,
        percent: Math.round((b.percent / currentTotal) * targetExistingTotal),
      }));

      const adjustedExistingTotal = nextBlocks.reduce((sum, b) => sum + b.percent, 0);
      const diff = targetExistingTotal - adjustedExistingTotal;
      if (diff !== 0 && nextBlocks.length > 0) {
        const largestIdx = nextBlocks.reduce(
          (maxIdx, b, idx) => (b.percent > nextBlocks[maxIdx].percent ? idx : maxIdx),
          0
        );
        nextBlocks[largestIdx] = {
          ...nextBlocks[largestIdx],
          percent: nextBlocks[largestIdx].percent + diff,
        };
      }
    } else {
      newPercent = 100 - currentTotal;
    }

    nextBlocks.push({
      id,
      name: "Block",
      color: "bg-gray-500",
      percent: newPercent,
    });

    setBlocks(nextBlocks);
    setNextId((n) => n + 1);

    if (scheduleStarted && totalDurationMs > 0) {
      setBlockBatteries((prev) => {
        const nextBatteries = { ...prev };

        for (const oldBlock of blocks) {
          const newBlock = nextBlocks.find((b) => b.id === oldBlock.id);
          if (!newBlock) continue;

          const oldAllocation = Math.floor(totalDurationMs * (oldBlock.percent / 100));
          const oldRemaining = prev[oldBlock.id] ?? oldAllocation;
          const spent = Math.max(0, oldAllocation - oldRemaining);
          const newAllocation = Math.floor(totalDurationMs * (newBlock.percent / 100));
          nextBatteries[oldBlock.id] = Math.max(0, newAllocation - spent);
        }

        nextBatteries[id] = Math.floor(totalDurationMs * (newPercent / 100));
        return nextBatteries;
      });
    }
  }

  function updateBlock(id: number, name: string, color: string, percent: number) {
    const clampedPercent = Math.max(0, Math.min(100, percent));
    const othersTotal = blocks
      .filter((b) => b.id !== id)
      .reduce((sum, b) => sum + b.percent, 0);

    let nextBlocks = blocks.map((b) =>
      b.id === id ? { ...b, name, color, percent: clampedPercent } : b
    );

    if (othersTotal + clampedPercent > 100 && othersTotal > 0) {
      const targetOthersTotal = 100 - clampedPercent;
      const scale = targetOthersTotal / othersTotal;
      nextBlocks = nextBlocks.map((b) =>
        b.id === id ? b : { ...b, percent: Math.round(b.percent * scale) }
      );


      const adjustedOthersTotal = nextBlocks
        .filter((b) => b.id !== id)
        .reduce((sum, b) => sum + b.percent, 0);
      const diff = targetOthersTotal - adjustedOthersTotal;
      if (diff !== 0) {
        let largestIdx = -1;
        for (let i = 0; i < nextBlocks.length; i++) {
          if (nextBlocks[i].id === id) continue;
          if (largestIdx === -1 || nextBlocks[i].percent > nextBlocks[largestIdx].percent) {
            largestIdx = i;
          }
        }
        if (largestIdx !== -1) {
          nextBlocks[largestIdx] = {
            ...nextBlocks[largestIdx],
            percent: nextBlocks[largestIdx].percent + diff,
          };
        }
      }
    }

    setBlocks(nextBlocks);
    setEditingBlockId(null);

    if (scheduleStarted && totalDurationMs > 0) {
      setBlockBatteries((prev) => {
        const nextBatteries = { ...prev };
        for (const oldBlock of blocks) {
          const newBlock = nextBlocks.find((b) => b.id === oldBlock.id);
          if (!newBlock) continue;

          const oldAllocation = Math.floor(totalDurationMs * (oldBlock.percent / 100));
          const oldRemaining = prev[oldBlock.id] ?? oldAllocation;
          const spent = Math.max(0, oldAllocation - oldRemaining);
          const newAllocation = Math.floor(totalDurationMs * (newBlock.percent / 100));
          nextBatteries[oldBlock.id] = Math.max(0, newAllocation - spent);
        }
        return nextBatteries;
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
        <h2 className="text-white text-xl font-semibold">Blocks</h2>
        <button
          onClick={addEmptyBlock}
          className="text-white text-2xl hover:text-neutral-300 cursor-pointer"
        >
          +
        </button>
      </div>
      <div className="flex flex-wrap gap-4">
        {blocks.map((block) => (
          <Block
            key={block.id}
            block={block}
            isActive={activeBlockId === block.id}
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
        ))}
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
          title="Edit Block"
        />
      )}
    </section>
  );
}
