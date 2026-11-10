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
    0,
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
