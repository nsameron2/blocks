import { useEffect, useState } from "react";
import type { Block as BlockData } from "../types";
import { Block } from "./Block";
import { CreateBlockDialog } from "./CreateBlockDialog";

interface BlockManagerProps {
  totalDurationMs: number;
  scheduleStarted: boolean;
}

export function BlockManager({ totalDurationMs, scheduleStarted }: BlockManagerProps) {
  const [blocks, setBlocks] = useState<BlockData[]>([
    { id: 1, name: "Idle", color: "bg-gray-500", percent: 25 },
  ]);
  const [nextId, setNextId] = useState(2);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeBlockId, setActiveBlockId] = useState<number | null>(null);
  const [blockBatteries, setBlockBatteries] = useState<Record<number, number>>({});

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

  function handleCreateBlock(name: string, color: string, percent: number) {
    const id = nextId;
    setBlocks((prev) => [...prev, { id, name, color, percent }]);
    setNextId((n) => n + 1);
    setDialogOpen(false);

    if (scheduleStarted && totalDurationMs > 0) {
      setBlockBatteries((prev) => ({
        ...prev,
        [id]: Math.floor(totalDurationMs * (percent / 100)),
      }));
    }
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

  return (
    <section className="max-w-4xl mx-auto mt-16 px-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-white text-xl font-semibold">Blocks</h2>
        <button
          onClick={() => setDialogOpen(true)}
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
            onDelete={deleteBlock}
            remainingMs={blockBatteries[block.id] ?? 0}
            allocatedMs={
              scheduleStarted ? Math.floor(totalDurationMs * (block.percent / 100)) : 0
            }
          />
        ))}
      </div>

      {dialogOpen && (
        <CreateBlockDialog
          onClose={() => setDialogOpen(false)}
          onCreate={handleCreateBlock}
        />
      )}
    </section>
  );
}
