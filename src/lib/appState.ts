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
const DEFAULT_NEXT_PRESET_ID = 1;
const COMPLETION_TONES: CompletionTone[] = ["good", "bad", "neutral"];
const BUILT_IN_COMPLETION_SOUNDS: BuiltInCompletionSound[] = [
  ...COMPLETION_TONES,
  "timer",
];
const CUSTOM_SOUND_ID_PREFIX = "custom:";
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export interface AppState {
  version: number;
  blocks: BlocksState;
  blockTimer: BlockTimerState;
  schedule: LogOffSchedule;
  settings: AppSettings;
}

export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";
export type TimeFormatPreference = "12h" | "24h";
export type CustomCompletionSound = `${typeof CUSTOM_SOUND_ID_PREFIX}${string}`;
export type BuiltInCompletionSound = CompletionTone | "timer";
export type CompletionSound = BuiltInCompletionSound | CustomCompletionSound;
export type CompletionSoundSettings = Record<
  BuiltInCompletionSound,
  CompletionSound
>;

export interface AppSettings {
  appearance: AppearanceSettings;
  time: TimeSettings;
  sound: SoundSettings;
}

export interface AppearanceSettings {
  theme: ThemePreference;
}

export interface TimeSettings {
  timeFormat: TimeFormatPreference;
}

export interface SoundSettings {
  notificationVolume: number;
  completionSounds: CompletionSoundSettings;
  customSounds: CustomSound[];
}

export interface CustomSound {
  id: CustomCompletionSound;
  name: string;
  dataUrl: string;
}

export interface BlocksState {
  blocks: Block[];
  nextBlockId: number;
  activeBlockId: number | null;
  blockSpent: Record<number, number>;
  completionTones: Record<number, CompletionTone>;
  presets: BlockPreset[];
  nextPresetId: number;
}

export interface BlockPreset {
  id: number;
  name: string;
  blocks: Block[];
}

export interface BlockTimerState {
  targetAt: string | null;
  started: boolean;
  totalDurationMs: number;
  remainingMs: number;
}

export async function loadAppState(): Promise<AppState> {
  if (!isTauriRuntime()) {
    return createDefaultAppState();
  }

  const state = await invoke<unknown>("load_app_state");
  return normalizeAppState(state);
}

export async function saveAppState(state: AppState): Promise<void> {
  if (!isTauriRuntime()) {
    return;
  }

  await invoke("save_app_state", { state: normalizeAppState(state) });
}

export function createDefaultAppState(): AppState {
  return {
    version: APP_STATE_VERSION,
    blocks: createDefaultBlocksState(),
    blockTimer: createDefaultBlockTimerState(),
    schedule: createDefaultSchedule(),
    settings: createDefaultSettings(),
  };
}

export function createDefaultBlocksState(): BlocksState {
  return {
    blocks: [createDefaultBlock()],
    nextBlockId: DEFAULT_NEXT_BLOCK_ID,
    activeBlockId: null,
    blockSpent: {},
    completionTones: {},
    presets: [],
    nextPresetId: DEFAULT_NEXT_PRESET_ID,
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

export function createDefaultSettings(): AppSettings {
  return {
    appearance: {
      theme: "system",
    },
    time: {
      timeFormat: "12h",
    },
    sound: {
      notificationVolume: 100,
      completionSounds: {
        good: "good",
        bad: "bad",
        neutral: "neutral",
        timer: "timer",
      },
      customSounds: [],
    },
  };
}

export function normalizeAppState(value: unknown): AppState {
  const record = asRecord(value);

  return {
    version: APP_STATE_VERSION,
    blocks: normalizeBlocksState(record?.blocks),
    blockTimer: normalizeBlockTimerState(record?.blockTimer),
    schedule: normalizeSchedule(record?.schedule),
    settings: normalizeSettings(record?.settings),
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
  const presets = normalizeBlockPresets(record.presets);
  const maxPresetId = presets.reduce(
    (maxId, preset) => Math.max(maxId, preset.id),
    0,
  );
  const nextPresetId = Math.max(
    maxPresetId + 1,
    integerOr(record.nextPresetId, DEFAULT_NEXT_PRESET_ID),
  );

  return {
    blocks: safeBlocks,
    nextBlockId,
    activeBlockId,
    blockSpent: normalizeNumberMap(record.blockSpent, blockIds),
    completionTones: normalizeCompletionToneMap(record.completionTones, blockIds),
    presets,
    nextPresetId,
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

function normalizeBlockPresets(value: unknown): BlockPreset[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((preset, index) => normalizeBlockPreset(preset, index + 1))
    .filter((preset): preset is BlockPreset => Boolean(preset));
}

function normalizeBlockPreset(value: unknown, fallbackId: number): BlockPreset | null {
  const record = asRecord(value);
  if (!record) return null;

  const id = integerOr(record.id, fallbackId);
  if (id <= 0) return null;

  const name = stringOr(record.name, "").trim();
  if (!name) return null;

  const blocks = Array.isArray(record.blocks)
    ? record.blocks
        .map((block, index) => normalizeBlock(block, index + 1))
        .filter((block): block is Block => Boolean(block))
    : [];
  if (blocks.length === 0) return null;

  return {
    id,
    name,
    blocks,
  };
}

function normalizeBlockTimerState(value: unknown): BlockTimerState {
  const defaults = createDefaultBlockTimerState();
  const record = asRecord(value);
  if (!record) return defaults;

  const targetAt = validIsoDateOrNull(record.targetAt);
  const savedStarted =
    typeof record.started === "boolean" ? record.started : false;
  const totalDurationMs = nonNegativeIntegerOr(record.totalDurationMs, 0);

  if (!targetAt) return defaults;

  if (!savedStarted) {
    return {
      targetAt,
      started: false,
      totalDurationMs: 0,
      remainingMs: 0,
    };
  }

  const remainingMs = Math.max(0, Date.parse(targetAt) - Date.now());

  return {
    targetAt,
    started: remainingMs > 0,
    totalDurationMs: Math.max(totalDurationMs, remainingMs),
    remainingMs,
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

function normalizeSettings(value: unknown): AppSettings {
  const defaults = createDefaultSettings();
  const record = asRecord(value);
  if (!record) return defaults;

  return {
    appearance: normalizeAppearanceSettings(record.appearance),
    time: normalizeTimeSettings(record.time),
    sound: normalizeSoundSettings(record.sound),
  };
}

function normalizeAppearanceSettings(value: unknown): AppearanceSettings {
  const defaults = createDefaultSettings().appearance;
  const record = asRecord(value);
  if (!record) return defaults;

  return {
    theme: themePreferenceOr(record.theme, defaults.theme),
  };
}

function normalizeTimeSettings(value: unknown): TimeSettings {
  const defaults = createDefaultSettings().time;
  const record = asRecord(value);
  if (!record) return defaults;

  return {
    timeFormat: timeFormatPreferenceOr(record.timeFormat, defaults.timeFormat),
  };
}

function normalizeSoundSettings(value: unknown): SoundSettings {
  const defaults = createDefaultSettings().sound;
  const record = asRecord(value);
  if (!record) return defaults;
  const customSounds = normalizeCustomSounds(record.customSounds);
  const customSoundIds = new Set(customSounds.map((sound) => sound.id));

  return {
    notificationVolume: clamp(
      integerOr(record.notificationVolume, defaults.notificationVolume),
      0,
      100,
    ),
    completionSounds: normalizeCompletionSoundSettings(
      record.completionSounds,
      customSoundIds,
    ),
    customSounds,
  };
}

function normalizeCompletionSoundSettings(
  value: unknown,
  customSoundIds: Set<CustomCompletionSound>,
): CompletionSoundSettings {
  const defaults = createDefaultSettings().sound.completionSounds;
  const record = asRecord(value);
  if (!record) return defaults;

  return {
    good: completionSoundOr(record.good, defaults.good, customSoundIds),
    bad: completionSoundOr(record.bad, defaults.bad, customSoundIds),
    neutral: completionSoundOr(record.neutral, defaults.neutral, customSoundIds),
    timer: completionSoundOr(record.timer, defaults.timer, customSoundIds),
  };
}

function normalizeCustomSounds(value: unknown): CustomSound[] {
  if (!Array.isArray(value)) return [];

  const customSounds: CustomSound[] = [];
  const seenIds = new Set<CustomCompletionSound>();

  for (const item of value) {
    const customSound = normalizeCustomSound(item);
    if (!customSound || seenIds.has(customSound.id)) continue;
    seenIds.add(customSound.id);
    customSounds.push(customSound);
  }

  return customSounds;
}

function normalizeCustomSound(value: unknown): CustomSound | null {
  const record = asRecord(value);
  if (!record) return null;
  if (!isCustomCompletionSoundId(record.id)) return null;
  if (typeof record.dataUrl !== "string" || !record.dataUrl.startsWith("data:")) {
    return null;
  }

  const name = stringOr(record.name, "").trim();

  return {
    id: record.id,
    name: name || "Custom sound",
    dataUrl: record.dataUrl,
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

function isTauriRuntime() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
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

function themePreferenceOr(
  value: unknown,
  fallback: ThemePreference,
): ThemePreference {
  return value === "system" || value === "light" || value === "dark"
    ? value
    : fallback;
}

function timeFormatPreferenceOr(
  value: unknown,
  fallback: TimeFormatPreference,
): TimeFormatPreference {
  return value === "12h" || value === "24h" ? value : fallback;
}

function completionSoundOr(
  value: unknown,
  fallback: CompletionSound,
  customSoundIds: Set<CustomCompletionSound>,
): CompletionSound {
  if (isBuiltInCompletionSound(value)) return value;
  if (isCustomCompletionSoundId(value) && customSoundIds.has(value)) {
    return value;
  }

  return fallback;
}

export function isBuiltInCompletionSound(
  value: unknown,
): value is BuiltInCompletionSound {
  return (
    typeof value === "string" &&
    BUILT_IN_COMPLETION_SOUNDS.includes(value as BuiltInCompletionSound)
  );
}

function isCompletionTone(value: unknown): value is CompletionTone {
  return (
    typeof value === "string" &&
    COMPLETION_TONES.includes(value as CompletionTone)
  );
}

function isCustomCompletionSoundId(
  value: unknown,
): value is CustomCompletionSound {
  return (
    typeof value === "string" &&
    value.startsWith(CUSTOM_SOUND_ID_PREFIX) &&
    value.length > CUSTOM_SOUND_ID_PREFIX.length
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
