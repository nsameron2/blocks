import { useCallback, useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { RefreshCw } from "lucide-react";
import completeBadSound from "../assets/sounds/complete-bad.mp3";
import completeGoodSound from "../assets/sounds/complete-good.mp3";
import completeNeutralSound from "../assets/sounds/complete-neutral.mp3";
import type { Block as BlockData, CompletionTone } from "../types";
import { Block } from "./Block";
import { Muxer } from "./Muxer";

const COMPLETION_SOUNDS: Record<CompletionTone, string> = {
  good: completeGoodSound,
  bad: completeBadSound,
  neutral: completeNeutralSound,
};

interface BlockManagerProps {
  totalDurationMs: number;
  scheduleStarted: boolean;
}

function completionToneForBlock(block: BlockData): CompletionTone {
  if (block.good === true) return "good";
  if (block.good === false) return "bad";
  return "neutral";
}

export function BlockManager({ totalDurationMs, scheduleStarted }: BlockManagerProps) {
  const [blocks, setBlocks] = useState<BlockData[]>([
    {
      id: 1,
      name: "Idle",
      color: "bg-gray-500",
      percent: 25,
      emoji: "⏲️",
      good: false,
    },
  ]);
  const [nextId, setNextId] = useState(2);
  const [activeBlockId, setActiveBlockId] = useState<number | null>(null);
  const [blockSpent, setBlockSpent] = useState<Record<number, number>>({});
  const [completionTones, setCompletionTones] = useState<Record<number, CompletionTone>>({});
  const blocksRef = useRef(blocks);
  const completionTonesRef = useRef(completionTones);
  const completionAudioRef = useRef<Partial<Record<CompletionTone, HTMLAudioElement>>>({});
  const blockElementsRef = useRef<Record<number, HTMLDivElement>>({});
  blocksRef.current = blocks;
  completionTonesRef.current = completionTones;

  const registerBlockElement = useCallback(
    (id: number, element: HTMLDivElement | null) => {
      if (element) {
        blockElementsRef.current[id] = element;
      } else {
        delete blockElementsRef.current[id];
      }
    },
    [],
  );

  function playCompletionSound(tone: CompletionTone) {
    const audio =
      completionAudioRef.current[tone] ?? new Audio(COMPLETION_SOUNDS[tone]);
    completionAudioRef.current[tone] = audio;
    audio.currentTime = 0;
    void audio.play().catch(() => undefined);
  }

  function fireGoodCompletionConfetti(blockId: number) {
    const element = blockElementsRef.current[blockId];
    if (!element) return;

    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const origin = {
      x: Math.min(1, Math.max(0, (rect.left + rect.width / 2) / window.innerWidth)),
      y: Math.min(1, Math.max(0, rect.bottom / window.innerHeight)),
    };

    void confetti({
      angle: 90,
      spread: 72,
      particleCount: 90,
      startVelocity: 36,
      gravity: 0.95,
      scalar: 0.9,
      ticks: 170,
      origin,
      colors: ["#22c55e", "#4ade80", "#86efac", "#ffffff"],
      disableForReducedMotion: true,
    });
  }

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
        const currentSpent = prev[activeBlockId] ?? 0;
        return { ...prev, [activeBlockId]: currentSpent + 1000 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [scheduleStarted, activeBlockId, totalDurationMs]);

  useEffect(() => {
    if (!scheduleStarted) return;

    let nextCompletionTones = completionTonesRef.current;
    let copied = false;
    let changed = false;

    function ensureCopy() {
      if (!copied) {
        nextCompletionTones = { ...nextCompletionTones };
        copied = true;
      }
    }

    const currentIds = new Set(blocks.map((block) => block.id));
    for (const id of Object.keys(nextCompletionTones).map(Number)) {
      if (!currentIds.has(id)) {
        ensureCopy();
        delete nextCompletionTones[id];
        changed = true;
      }
    }

    for (const block of blocks) {
      const allocatedMs = Math.floor(totalDurationMs * (block.percent / 100));
      const spentMs = blockSpent[block.id] ?? 0;
      const isComplete = allocatedMs > 0 && spentMs >= allocatedMs;
      const completionTone = nextCompletionTones[block.id];

      if (isComplete && completionTone === undefined) {
        const tone = completionToneForBlock(block);
        ensureCopy();
        nextCompletionTones[block.id] = tone;
        changed = true;
        playCompletionSound(tone);
        if (tone === "good") {
          fireGoodCompletionConfetti(block.id);
        }
      }

      if (!isComplete && completionTone !== undefined) {
        ensureCopy();
        delete nextCompletionTones[block.id];
        changed = true;
      }
    }

    if (changed) {
      completionTonesRef.current = nextCompletionTones;
      setCompletionTones(nextCompletionTones);
    }
  }, [blockSpent, blocks, scheduleStarted, totalDurationMs]);

  const totalAllocated = blocks.reduce((sum, b) => sum + b.percent, 0);
  const remainingPercent = Math.max(0, 100 - totalAllocated);
  const newBlockPercent = Math.max(0, Math.min(25, remainingPercent));

  function addEmptyBlock() {
    const id = nextId;

    setBlocks((prev) => [
      ...prev,
      {
        id,
        name: "Idle",
        color: "bg-gray-500",
        percent: newBlockPercent,
        emoji: "⏲️",
        good: null,
      },
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

  function updateBlockGood(id: number, good: boolean | null) {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, good } : b))
    );
  }

  function deleteBlock(id: number) {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    setBlockSpent((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setCompletionTones((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    delete blockElementsRef.current[id];
    if (activeBlockId === id) {
      setActiveBlockId(null);
    }
  }

  function resetBlocks() {
    setBlocks([
      {
        id: 1,
        name: "Idle",
        color: "bg-gray-500",
        percent: 25,
        emoji: "⏲️",
        good: false,
      },
    ]);
    setNextId(2);
    setBlockSpent({});
    setCompletionTones({});
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
          const remainingMs = allocatedMs - spentMs;
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
              onGoodChange={updateBlockGood}
              onElementChange={registerBlockElement}
              completionTone={completionTones[block.id] ?? null}
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
