import { invoke } from "@tauri-apps/api/core";
import {
  DEFAULT_LOG_OFF_SCHEDULE,
  type LogOffSchedule,
  type Weekday,
} from "./logOffSchedule";
import type { Block, CompletionTone } from "./types";

export const APP_STATE_VERSION = 1;
const DEFAULT_BLOCK_ID = 1;
const DEFAULT_NEXT_BLOCK_ID = 2;
const COMPLETION_TONES: CompletionTone[] = ["good", "bad", "neutral"];
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export interface AppState {
  version: number;
  blocks: BlocksState;
  blockTimer: BlockTimerState;
  schedule: LogOffSchedule;
}

export interface BlocksState {
  blocks: Block[];
  nextBlockId: number;
  activeBlockId: number | null;
  blockSpent: Record<number, number>;
  completionTones: Record<number, CompletionTone>;
}

export interface BlockTimerState {
  targetAt: string | null;
  started: boolean;
  totalDurationMs: number;
  remainingMs: number;
}

export async function loadAppState(): Promise<AppState> {
  const state = await invoke<unknown>("load_app_state");
  return normalizeAppState(state);
}

export async function saveAppState(state: AppState): Promise<void> {
  await invoke("save_app_state", { state: normalizeAppState(state) });
}

export function createDefaultAppState(): AppState {
  return {
    version: APP_STATE_VERSION,
    blocks: createDefaultBlocksState(),
    blockTimer: createDefaultBlockTimerState(),
    schedule: createDefaultSchedule(),
  };
}

export function createDefaultBlocksState(): BlocksState {
  return {
    blocks: [createDefaultBlock()],
    nextBlockId: DEFAULT_NEXT_BLOCK_ID,
    activeBlockId: null,
    blockSpent: {},
    completionTones: {},
  };
}

export function createDefaultBlockTimerState(): BlockTimerState {
  return {
    targetAt: null,
    started: false,
    totalDurationMs: 0,
    remainingMs: 0,
  };
}

export function createDefaultSchedule(): LogOffSchedule {
  return {
    defaultTime: DEFAULT_LOG_OFF_SCHEDULE.defaultTime,
    weekdayOverrides: { ...DEFAULT_LOG_OFF_SCHEDULE.weekdayOverrides },
    dateOverrides: { ...DEFAULT_LOG_OFF_SCHEDULE.dateOverrides },
  };
}

export function normalizeAppState(value: unknown): AppState {
  const record = asRecord(value);

  return {
    version: APP_STATE_VERSION,
    blocks: normalizeBlocksState(record?.blocks),
    blockTimer: normalizeBlockTimerState(record?.blockTimer),
    schedule: normalizeSchedule(record?.schedule),
  };
}

function createDefaultBlock(): Block {
  return {
    id: DEFAULT_BLOCK_ID,
    name: "Idle",
    color: "bg-gray-500",
    percent: 25,
    emoji: "⏲️",
    good: false,
  };
}

function normalizeBlocksState(value: unknown): BlocksState {
  const defaults = createDefaultBlocksState();
  const record = asRecord(value);
  if (!record) return defaults;

  const blocks = Array.isArray(record.blocks)
    ? record.blocks
        .map((block, index) => normalizeBlock(block, index + 1))
        .filter((block): block is Block => Boolean(block))
    : defaults.blocks;
  const safeBlocks = blocks.length > 0 ? blocks : defaults.blocks;
  const blockIds = new Set(safeBlocks.map((block) => block.id));
  const maxBlockId = Math.max(...safeBlocks.map((block) => block.id));
  const nextBlockId = Math.max(
    maxBlockId + 1,
    integerOr(record.nextBlockId, DEFAULT_NEXT_BLOCK_ID),
  );
  const activeBlockId = nullableExistingId(record.activeBlockId, blockIds);

  return {
    blocks: safeBlocks,
    nextBlockId,
    activeBlockId,
    blockSpent: normalizeNumberMap(record.blockSpent, blockIds),
    completionTones: normalizeCompletionToneMap(record.completionTones, blockIds),
  };
}

function normalizeBlock(value: unknown, fallbackId: number): Block | null {
  const record = asRecord(value);
  if (!record) return null;

  const id = integerOr(record.id, fallbackId);
  if (id <= 0) return null;

  return {
    id,
    name: stringOr(record.name, "Block"),
    color: stringOr(record.color, "bg-gray-500"),
    percent: clamp(integerOr(record.percent, 0), 0, 100),
    emoji: stringOr(record.emoji, "🆕"),
    good: nullableBoolean(record.good),
  };
}

function normalizeBlockTimerState(value: unknown): BlockTimerState {
  const defaults = createDefaultBlockTimerState();
  const record = asRecord(value);
  if (!record) return defaults;

  return {
    targetAt: validIsoDateOrNull(record.targetAt),
    started: typeof record.started === "boolean" ? record.started : false,
    totalDurationMs: nonNegativeIntegerOr(record.totalDurationMs, 0),
    remainingMs: nonNegativeIntegerOr(record.remainingMs, 0),
  };
}

function normalizeSchedule(value: unknown): LogOffSchedule {
  const defaults = createDefaultSchedule();
  const record = asRecord(value);
  if (!record) return defaults;

  return {
    defaultTime: timeOrEmpty(record.defaultTime),
    weekdayOverrides: normalizeWeekdayOverrides(record.weekdayOverrides),
    dateOverrides: normalizeDateOverrides(record.dateOverrides),
  };
}

function normalizeWeekdayOverrides(value: unknown): LogOffSchedule["weekdayOverrides"] {
  const record = asRecord(value);
  if (!record) return {};

  const overrides: LogOffSchedule["weekdayOverrides"] = {};
  for (const [key, time] of Object.entries(record)) {
    const weekday = Number(key);
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) continue;
    if (typeof time !== "string" || !TIME_PATTERN.test(time)) continue;
    overrides[weekday as Weekday] = time;
  }

  return overrides;
}

function normalizeDateOverrides(value: unknown): LogOffSchedule["dateOverrides"] {
  const record = asRecord(value);
  if (!record) return {};

  const overrides: LogOffSchedule["dateOverrides"] = {};
  for (const [dateKey, time] of Object.entries(record)) {
    if (!DATE_KEY_PATTERN.test(dateKey)) continue;
    if (typeof time !== "string" || !TIME_PATTERN.test(time)) continue;
    overrides[dateKey] = time;
  }

  return overrides;
}

function normalizeNumberMap(
  value: unknown,
  allowedIds: Set<number>,
): Record<number, number> {
  const record = asRecord(value);
  if (!record) return {};

  const numberMap: Record<number, number> = {};
  for (const [key, rawValue] of Object.entries(record)) {
    const id = Number(key);
    if (!allowedIds.has(id)) continue;
    numberMap[id] = nonNegativeIntegerOr(rawValue, 0);
  }

  return numberMap;
}

function normalizeCompletionToneMap(
  value: unknown,
  allowedIds: Set<number>,
): Record<number, CompletionTone> {
  const record = asRecord(value);
  if (!record) return {};

  const toneMap: Record<number, CompletionTone> = {};
  for (const [key, rawValue] of Object.entries(record)) {
    const id = Number(key);
    if (!allowedIds.has(id) || !isCompletionTone(rawValue)) continue;
    toneMap[id] = rawValue;
  }

  return toneMap;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function integerOr(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.trunc(value)
    : fallback;
}

function nonNegativeIntegerOr(value: unknown, fallback: number) {
  return Math.max(0, integerOr(value, fallback));
}

function stringOr(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

function timeOrEmpty(value: unknown) {
  return typeof value === "string" && TIME_PATTERN.test(value) ? value : "";
}

function nullableBoolean(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

function nullableExistingId(value: unknown, allowedIds: Set<number>) {
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  return allowedIds.has(value) ? value : null;
}

function validIsoDateOrNull(value: unknown) {
  if (typeof value !== "string") return null;
  return Number.isNaN(Date.parse(value)) ? null : value;
}

function isCompletionTone(value: unknown): value is CompletionTone {
  return (
    typeof value === "string" &&
    COMPLETION_TONES.includes(value as CompletionTone)
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
