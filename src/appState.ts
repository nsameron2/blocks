import type { LogOffSchedule } from "./logOffSchedule";
import type { Block, CompletionTone } from "./types";

export const APP_STATE_VERSION = 1;

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
