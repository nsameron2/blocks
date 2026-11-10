import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import confetti from "canvas-confetti";
import { ChevronDown, RefreshCw, Save, Trash2 } from "lucide-react";
import {
  createDefaultBlocksState,
  type AISettings,
  type BlocksState,
  type CompletionSoundSettings,
  type CustomSound,
  type ResolvedTheme,
} from "../lib/appState";
import { autocompleteBlock } from "../lib/blockAutocomplete";
import { completionSoundSource } from "../lib/completionSounds";
import { sendBlockCompletionNotification } from "../lib/notifications";
import { playSound } from "../lib/soundPlayer";
import type { Block as BlockData, CompletionTone } from "../lib/types";
import { Block } from "./Block";
import { Muxer } from "./Muxer";

interface BlockManagerProps {
  blocksState: BlocksState;
  onBlocksStateChange: Dispatch<SetStateAction<BlocksState>>;
  totalDurationMs: number;
  scheduleStarted: boolean;
  resolvedTheme: ResolvedTheme;
  notificationVolume: number;
  completionSounds: CompletionSoundSettings;
  customSounds: CustomSound[];
  aiSettings: AISettings;
}

type AutocompleteState =
  | { status: "loading" }
  | { status: "error"; message: string };

const AUTOCOMPLETE_DELAY_MS = 750;

function completionToneForBlock(block: BlockData): CompletionTone {
  if (block.good === true) return "good";
  if (block.good === false) return "bad";
  return "neutral";
}

function updateBlocks(
  state: BlocksState,
  updateBlock: (block: BlockData) => BlockData,
): BlocksState {
  return {
    ...state,
    blocks: state.blocks.map(updateBlock),
  };
}

function cloneBlocks(blocks: BlockData[]): BlockData[] {
  return blocks.map((block) => ({ ...block }));
}

export function BlockManager({
  blocksState,
  onBlocksStateChange,
  totalDurationMs,
  scheduleStarted,
  resolvedTheme,
  notificationVolume,
  completionSounds,
  customSounds,
  aiSettings,
}: BlockManagerProps) {
  const {
    blocks,
    activeBlockId,
    blockSpent,
    completionTones,
    presets,
    nextPresetId,
  } = blocksState;
  const completionTonesRef = useRef(completionTones);
  const blockElementsRef = useRef<Record<number, HTMLDivElement>>({});
  const presetMenuRef = useRef<HTMLDivElement>(null);
  const autocompleteTimersRef = useRef<Record<number, number>>({});
  const autocompleteControllersRef = useRef<Record<number, AbortController>>({});
  const autocompleteGenerationsRef = useRef<Record<number, number>>({});
  const [presetName, setPresetName] = useState("");
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const [presetsOpen, setPresetsOpen] = useState(false);
  const [autocompleteStates, setAutocompleteStates] = useState<
    Record<number, AutocompleteState>
  >({});
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

  useEffect(() => {
    if (!presetsOpen) return;

    function closePresetMenu(event: MouseEvent) {
      if (!(event.target instanceof Node)) return;
      if (presetMenuRef.current?.contains(event.target)) return;
      setPresetsOpen(false);
    }

    window.addEventListener("mousedown", closePresetMenu);
    return () => window.removeEventListener("mousedown", closePresetMenu);
  }, [presetsOpen]);

  useEffect(() => {
    cancelAllAutocompletions();
  }, [
    aiSettings.apiKey,
    aiSettings.enabled,
    aiSettings.model,
    aiSettings.url,
  ]);

  useEffect(
    () => () => {
      for (const timer of Object.values(autocompleteTimersRef.current)) {
        window.clearTimeout(timer);
      }
      for (const controller of Object.values(
        autocompleteControllersRef.current,
      )) {
        controller.abort();
      }
      for (const id of Object.keys(autocompleteGenerationsRef.current).map(Number)) {
        autocompleteGenerationsRef.current[id] += 1;
      }
    },
    [],
  );

  function cancelAllAutocompletions() {
    const ids = new Set([
      ...Object.keys(autocompleteTimersRef.current).map(Number),
      ...Object.keys(autocompleteControllersRef.current).map(Number),
      ...Object.keys(autocompleteGenerationsRef.current).map(Number),
    ]);
    for (const timer of Object.values(autocompleteTimersRef.current)) {
      window.clearTimeout(timer);
    }
    for (const controller of Object.values(autocompleteControllersRef.current)) {
      controller.abort();
    }
    for (const id of ids) {
      autocompleteGenerationsRef.current[id] =
        (autocompleteGenerationsRef.current[id] ?? 0) + 1;
    }
    autocompleteTimersRef.current = {};
    autocompleteControllersRef.current = {};
    setAutocompleteStates({});
  }

  function playCompletionSound(tone: CompletionTone) {
    const volume = Math.max(0, Math.min(1, notificationVolume / 100));
    if (volume === 0) return;

    const sound = completionSounds[tone] ?? tone;
    const source =
      completionSoundSource(sound, customSounds) ??
      completionSoundSource(tone, customSounds);
    if (!source) return;

    playSound(source, volume);
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
      onBlocksStateChange((previous) => {
        if (previous.activeBlockId !== null || previous.blocks.length === 0) {
          return previous;
        }

        return { ...previous, activeBlockId: previous.blocks[0].id };
      });
    }
  }, [activeBlockId, blocks.length, onBlocksStateChange, scheduleStarted]);

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
        void sendBlockCompletionNotification(block, tone).catch((error) => {
          console.error("Failed to send block completion notification", error);
        });
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
      onBlocksStateChange((previous) => ({
        ...previous,
        completionTones: nextCompletionTones,
      }));
    }
  }, [
    blockSpent,
    blocks,
    completionSounds,
    customSounds,
    notificationVolume,
    onBlocksStateChange,
    scheduleStarted,
    totalDurationMs,
  ]);

  const totalAllocated = blocks.reduce((sum, b) => sum + b.percent, 0);
  const remainingPercent = Math.max(0, 100 - totalAllocated);
  const newBlockPercent = Math.max(0, Math.min(25, remainingPercent));

  function addEmptyBlock() {
    onBlocksStateChange((previous) => {
      const id = previous.nextBlockId;

      return {
        ...previous,
        blocks: [
          ...previous.blocks,
          {
            id,
            name: "Block",
            color: "bg-gray-500",
            percent: newBlockPercent,
            emoji: "🆕",
            good: null,
          },
        ],
        nextBlockId: id + 1,
      };
    });
  }

  function renameBlock(id: number, name: string) {
    onBlocksStateChange((previous) =>
      updateBlocks(previous, (block) => (block.id === id ? { ...block, name } : block))
    );
    scheduleBlockAutocomplete(id, name);
  }

  function scheduleBlockAutocomplete(id: number, name: string) {
    const currentTimer = autocompleteTimersRef.current[id];
    if (currentTimer !== undefined) window.clearTimeout(currentTimer);
    autocompleteControllersRef.current[id]?.abort();
    delete autocompleteControllersRef.current[id];

    const generation = (autocompleteGenerationsRef.current[id] ?? 0) + 1;
    autocompleteGenerationsRef.current[id] = generation;
    const title = name.trim();
    const configured =
      aiSettings.enabled &&
      Boolean(aiSettings.url.trim()) &&
      Boolean(aiSettings.apiKey.trim()) &&
      Boolean(aiSettings.model.trim());

    if (!configured || !title) {
      setAutocompleteStates((previous) => {
        if (!(id in previous)) return previous;
        const next = { ...previous };
        delete next[id];
        return next;
      });
      return;
    }

    setAutocompleteStates((previous) => ({
      ...previous,
      [id]: { status: "loading" },
    }));
    const settingsSnapshot = { ...aiSettings };
    autocompleteTimersRef.current[id] = window.setTimeout(() => {
      delete autocompleteTimersRef.current[id];
      const controller = new AbortController();
      autocompleteControllersRef.current[id] = controller;

      void autocompleteBlock(title, settingsSnapshot, controller.signal)
        .then((metadata) => {
          if (autocompleteGenerationsRef.current[id] !== generation) return;

          onBlocksStateChange((previous) =>
            updateBlocks(previous, (block) => {
              if (block.id !== id || block.name.trim() !== title) return block;
              return {
                ...block,
                emoji: metadata.emoji,
                color: metadata.color,
                good:
                  metadata.status === "neutral"
                    ? null
                    : metadata.status === "good",
              };
            }),
          );
          setAutocompleteStates((previous) => {
            const next = { ...previous };
            delete next[id];
            return next;
          });
        })
        .catch((error: unknown) => {
          if (
            controller.signal.aborted ||
            autocompleteGenerationsRef.current[id] !== generation
          ) {
            return;
          }
          setAutocompleteStates((previous) => ({
            ...previous,
            [id]: { status: "error", message: errorMessage(error) },
          }));
        })
        .finally(() => {
          if (autocompleteControllersRef.current[id] === controller) {
            delete autocompleteControllersRef.current[id];
          }
        });
    }, AUTOCOMPLETE_DELAY_MS);
  }

  function updateBlockPercent(id: number, percent: number) {
    onBlocksStateChange((previous) => {
      const othersTotal = previous.blocks
        .filter((block) => block.id !== id)
        .reduce((sum, block) => sum + block.percent, 0);
      const maxAllowed = Math.max(0, 100 - othersTotal);
      const clampedPercent = Math.max(0, Math.min(maxAllowed, percent));

      return updateBlocks(previous, (block) =>
        block.id === id ? { ...block, percent: clampedPercent } : block,
      );
    });
  }

  function applyBlockPercents(updates: { id: number; percent: number }[]) {
    if (updates.length === 0) return;
    onBlocksStateChange((previous) =>
      updateBlocks(previous, (block) => {
        const update = updates.find((item) => item.id === block.id);
        if (update) {
          return {
            ...block,
            percent: Math.max(0, Math.min(100, update.percent)),
          };
        }

        return block;
      }),
    );
  }

  function updateBlockColor(id: number, color: string) {
    onBlocksStateChange((previous) =>
      updateBlocks(previous, (block) => (block.id === id ? { ...block, color } : block))
    );
  }

  function updateBlockEmoji(id: number, emoji: string) {
    onBlocksStateChange((previous) =>
      updateBlocks(previous, (block) => (block.id === id ? { ...block, emoji } : block))
    );
  }

  function updateBlockGood(id: number, good: boolean | null) {
    onBlocksStateChange((previous) =>
      updateBlocks(previous, (block) => (block.id === id ? { ...block, good } : block))
    );
  }

  function deleteBlock(id: number) {
    const autocompleteTimer = autocompleteTimersRef.current[id];
    if (autocompleteTimer !== undefined) window.clearTimeout(autocompleteTimer);
    autocompleteControllersRef.current[id]?.abort();
    delete autocompleteTimersRef.current[id];
    delete autocompleteControllersRef.current[id];
    autocompleteGenerationsRef.current[id] =
      (autocompleteGenerationsRef.current[id] ?? 0) + 1;
    setAutocompleteStates((previous) => {
      if (!(id in previous)) return previous;
      const next = { ...previous };
      delete next[id];
      return next;
    });
    delete blockElementsRef.current[id];
    onBlocksStateChange((previous) => {
      const blockSpent = { ...previous.blockSpent };
      const completionTones = { ...previous.completionTones };

      delete blockSpent[id];
      delete completionTones[id];

      return {
        ...previous,
        blocks: previous.blocks.filter((block) => block.id !== id),
        activeBlockId:
          previous.activeBlockId === id ? null : previous.activeBlockId,
        blockSpent,
        completionTones,
      };
    });
  }

  function resetBlocks() {
    cancelAllAutocompletions();
    onBlocksStateChange((previous) => ({
      ...createDefaultBlocksState(),
      presets: previous.presets,
      nextPresetId: previous.nextPresetId,
    }));
  }

  function savePreset() {
    const trimmedName = presetName.trim();
    if (!trimmedName) return;

    const existingPreset = presets.find(
      (preset) => preset.name.toLowerCase() === trimmedName.toLowerCase(),
    );
    const presetBlocks = cloneBlocks(blocks);

    if (existingPreset) {
      onBlocksStateChange((previous) => ({
        ...previous,
        presets: previous.presets.map((preset) =>
          preset.id === existingPreset.id
            ? { ...preset, name: trimmedName, blocks: presetBlocks }
            : preset,
        ),
      }));
      setSelectedPresetId(String(existingPreset.id));
      setPresetName(trimmedName);
      return;
    }

    const id = nextPresetId;
    onBlocksStateChange((previous) => ({
      ...previous,
      presets: [
        ...previous.presets,
        {
          id,
          name: trimmedName,
          blocks: presetBlocks,
        },
      ],
      nextPresetId: id + 1,
    }));
    setSelectedPresetId(String(id));
    setPresetName(trimmedName);
  }

  function deletePreset(presetId: number) {
    onBlocksStateChange((previous) => ({
      ...previous,
      presets: previous.presets.filter((preset) => preset.id !== presetId),
    }));
    if (selectedPresetId === String(presetId)) {
      setSelectedPresetId("");
    }
  }

  function loadPreset(presetId: string) {
    setSelectedPresetId(presetId);
    const preset = presets.find((item) => String(item.id) === presetId);
    if (!preset) return;

    cancelAllAutocompletions();

    const presetBlocks = cloneBlocks(preset.blocks);
    const maxBlockId = presetBlocks.reduce(
      (maxId, block) => Math.max(maxId, block.id),
      0,
    );

    onBlocksStateChange((previous) => ({
      ...previous,
      blocks: presetBlocks,
      nextBlockId: maxBlockId + 1,
      activeBlockId: null,
      blockSpent: {},
      completionTones: {},
    }));
    setPresetName(preset.name);
    setPresetsOpen(false);
  }

  return (
    <section className="max-w-4xl mx-auto mt-16 px-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-[var(--app-text)] text-xl font-semibold">
          Blocks
        </h2>
        <div className="flex items-center gap-3">
          <div ref={presetMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setPresetsOpen((open) => !open)}
              className="flex h-8 cursor-pointer items-center gap-2 rounded-md bg-[var(--app-surface)] px-3 text-sm font-semibold text-[var(--app-text)] ring-1 ring-[var(--app-border)] transition-colors hover:bg-[var(--app-secondary-control-hover)]"
              aria-expanded={presetsOpen}
              aria-haspopup="menu"
            >
              Presets
              <ChevronDown size={16} />
            </button>
            {presetsOpen && (
              <div className="absolute right-0 top-full z-30 mt-2 w-64 rounded-md bg-[var(--app-surface)] p-2 shadow-xl shadow-[var(--app-shadow)] ring-1 ring-[var(--app-border)]">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={presetName}
                    onChange={(event) => setPresetName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        savePreset();
                      }
                    }}
                    placeholder="Preset name"
                    className="h-8 min-w-0 flex-1 rounded-md bg-[var(--app-surface-2)] px-2 text-sm text-[var(--app-text)] placeholder:text-[var(--app-muted)] outline-none ring-1 ring-[var(--app-border)] focus:ring-[var(--app-focus)]"
                  />
                  <button
                    type="button"
                    onClick={savePreset}
                    disabled={!presetName.trim()}
                    title="Save preset"
                    aria-label="Save block preset"
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-[var(--app-text)] transition-colors hover:bg-[var(--app-hover)] hover:text-[var(--app-subtle)] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[var(--app-text)]"
                  >
                    <Save size={18} />
                  </button>
                </div>
                <div className="mt-2 max-h-48 overflow-y-auto border-t border-[var(--app-border)] pt-2">
                  {presets.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-[var(--app-muted)]">
                      No presets saved
                    </div>
                  ) : (
                    presets.map((preset) => (
                      <div
                        key={preset.id}
                        className={`group relative rounded-md transition-colors ${
                          selectedPresetId === String(preset.id)
                            ? "bg-[var(--app-hover)]"
                            : "hover:bg-[var(--app-hover)]"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => loadPreset(String(preset.id))}
                          className={`block w-full cursor-pointer rounded-md px-2 py-1.5 pr-8 text-left text-sm transition-colors ${
                            selectedPresetId === String(preset.id)
                              ? "text-[var(--app-text)]"
                              : "text-[var(--app-subtle)] group-hover:text-[var(--app-text)]"
                          }`}
                        >
                          {preset.name}
                        </button>
                        <button
                          type="button"
                          onClick={() => deletePreset(preset.id)}
                          className="absolute right-1 top-1/2 flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded text-red-400 opacity-0 transition-opacity hover:text-red-500 focus-visible:opacity-100 group-hover:opacity-100"
                          aria-label={`Delete preset ${preset.name}`}
                          title="Delete preset"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          <button
            onClick={resetBlocks}
            title="Reset blocks"
            className="text-[var(--app-text)] hover:text-[var(--app-subtle)] cursor-pointer transition-colors"
          >
            <RefreshCw size={20} />
          </button>
          <button
            onClick={addEmptyBlock}
            title={"Add block"}
            className="text-[var(--app-text)] text-2xl hover:text-[var(--app-subtle)] cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-[var(--app-text)]"
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
              onSelect={() =>
                onBlocksStateChange((previous) => ({
                  ...previous,
                  activeBlockId: block.id,
                }))
              }
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
              resolvedTheme={resolvedTheme}
              autocompleteState={autocompleteStates[block.id]}
            />
          );
        })}
      </div>
      <Muxer blocks={blocks} onApplyPercents={applyBlockPercents} />
    </section>
  );
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return "Block autocomplete failed.";
}
