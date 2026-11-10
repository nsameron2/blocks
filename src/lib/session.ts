import type { AppState, BlocksState } from "./appState";

// Derive elapsed time from the same deadline as the main countdown. Interval
// callbacks only refresh the display; their frequency never determines usage.
export function advanceSession(state: AppState, now = Date.now()): AppState {
  const { blockTimer, blocks } = state;
  if (!blockTimer.started || !blockTimer.targetAt) return state;
  const targetAt = Date.parse(blockTimer.targetAt);
  if (!Number.isFinite(targetAt)) return state;

  const remainingMs = targetAt - now;
  const elapsedMs = blockTimer.totalDurationMs - remainingMs;
  const spentMs = Object.values(blocks.blockSpent).reduce(
    (sum, ms) => sum + ms,
    blocks.archivedSpentMs,
  );
  const unaccountedMs = elapsedMs - spentMs;
  const chargedBlockId = blocks.activeBlockId ?? blocks.blocks[0]?.id ?? null;
  const charge = unaccountedMs > 0 && chargedBlockId !== null;
  if (!charge && remainingMs === blockTimer.remainingMs) return state;

  return {
    ...state,
    blockTimer: { ...blockTimer, remainingMs },
    blocks: charge
      ? {
          ...blocks,
          blockSpent: {
            ...blocks.blockSpent,
            [chargedBlockId]:
              (blocks.blockSpent[chargedBlockId] ?? 0) + unaccountedMs,
          },
        }
      : blocks,
  };
}

export function updateSessionBlocks(
  state: AppState,
  update: BlocksState | ((previous: BlocksState) => BlocksState),
  now = Date.now(),
): AppState {
  // Settle the old selection before applying a switch or any budget change.
  const current = advanceSession(state, now);
  return {
    ...current,
    blocks: typeof update === "function" ? update(current.blocks) : update,
  };
}

export function replaceSessionBlocks(
  state: AppState,
  update: BlocksState | ((previous: BlocksState) => BlocksState),
): AppState {
  // A new layout starts a new session. Keep the chosen deadline so Start can
  // budget only the time still available, after checking the new allocation.
  const blocks = typeof update === "function" ? update(state.blocks) : update;
  return {
    ...state,
    blocks: {
      ...blocks,
      activeBlockId: null,
      blockSpent: {},
      archivedSpentMs: 0,
      completionTones: {},
    },
    blockTimer: {
      ...state.blockTimer,
      started: false,
      totalDurationMs: 0,
      remainingMs: 0,
    },
  };
}

export function removeBlock(state: BlocksState, id: number): BlocksState {
  const blockSpent = { ...state.blockSpent };
  const completionTones = { ...state.completionTones };
  // Keep removed usage in the session ledger so refresh/reload cannot charge it
  // again to a surviving block. A new session clears this archived total.
  const archivedSpentMs = state.archivedSpentMs + (blockSpent[id] ?? 0);
  delete blockSpent[id];
  delete completionTones[id];

  return {
    ...state,
    blocks: state.blocks.filter((block) => block.id !== id),
    activeBlockId: state.activeBlockId === id ? null : state.activeBlockId,
    blockSpent,
    archivedSpentMs,
    completionTones,
  };
}
