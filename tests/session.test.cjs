const test = require("node:test");
const assert = require("node:assert/strict");
const { loadTypeScript } = require("./helpers.cjs");
const { advanceSession, removeBlock, replaceSessionBlocks, updateSessionBlocks } = loadTypeScript("src/lib/session.ts");
const { createDefaultAppState, normalizeAppState } = loadTypeScript("src/lib/appState.ts");

const start = Date.parse("2026-11-09T09:00:00Z");
const duration = 60 * 60 * 1000;
function session() {
  const state = createDefaultAppState();
  state.blocks.blocks = [
    { ...state.blocks.blocks[0], percent: 50 },
    { ...state.blocks.blocks[0], id: 2, percent: 50 },
  ];
  state.blocks.activeBlockId = 1;
  state.blockTimer = {
    started: true,
    targetAt: new Date(start + duration).toISOString(),
    totalDurationMs: duration,
    remainingMs: duration,
  };
  return state;
}

test("rapid block switches charge every partial second to the old selection", () => {
  let state = session();
  for (let i = 1; i <= 100; i++) {
    state = updateSessionBlocks(state, (blocks) => ({
      ...blocks, activeBlockId: blocks.activeBlockId === 1 ? 2 : 1,
    }), start + i * 900);
  }
  assert.deepEqual(state.blocks.blockSpent, { 1: 45000, 2: 45000 });
  assert.equal(state.blockTimer.remainingMs, duration - 90000);
});

test("a delayed refresh accounts for all elapsed time, including overtime", () => {
  let state = advanceSession(session(), start + 10 * 60 * 1000 + 123);
  assert.equal(state.blocks.blockSpent[1], 600123);
  assert.equal(state.blockTimer.remainingMs, duration - 600123);
  state = advanceSession(state, start + duration + 5000);
  assert.equal(state.blocks.blockSpent[1], duration + 5000);
  assert.equal(state.blockTimer.remainingMs, -5000);
  assert.equal(advanceSession(state, start + duration + 5000), state);
});

test("live resizing preserves spent time and uses the original session budget", () => {
  const state = updateSessionBlocks(session(), (blocks) => ({
    ...blocks,
    blocks: blocks.blocks.map((block) => ({ ...block, percent: block.id === 1 ? 25 : 75 })),
  }), start + 20 * 60 * 1000);
  assert.equal(state.blocks.blockSpent[1], 20 * 60 * 1000);
  assert.equal(state.blockTimer.totalDurationMs, duration);
  const remaining = state.blocks.blocks.map((block) =>
    Math.floor(duration * block.percent / 100) - (state.blocks.blockSpent[block.id] ?? 0));
  assert.deepEqual(remaining, [-5 * 60 * 1000, 45 * 60 * 1000]);
  assert.equal(remaining.reduce((sum, ms) => sum + ms, 0), state.blockTimer.remainingMs);
});

test("pre-start editing never charges a block", () => {
  const state = session();
  state.blockTimer.started = false;
  assert.equal(advanceSession(state, start + duration), state);
});

test("replacing a live layout returns to setup and retains its deadline", () => {
  const running = advanceSession(session(), start + duration / 2);
  const replacement = { ...running.blocks, blocks: [{ ...running.blocks.blocks[0], percent: 100 }] };
  const state = replaceSessionBlocks(running, replacement);
  assert.equal(state.blockTimer.started, false);
  assert.equal(state.blockTimer.targetAt, running.blockTimer.targetAt);
  assert.equal(state.blockTimer.totalDurationMs, 0);
  assert.deepEqual(state.blocks.blockSpent, {});
  assert.equal(state.blocks.activeBlockId, null);
  assert.equal(advanceSession(state, start + duration), state);

  // Starting again at the retained deadline only allocates the remaining half hour.
  const remaining = Date.parse(state.blockTimer.targetAt) - (start + duration / 2);
  assert.equal(remaining, 30 * 60 * 1000);
});

test("deleting a used block never transfers its history to another block", (t) => {
  t.mock.method(Date, "now", () => start + 960000);
  let state = updateSessionBlocks(session(), (blocks) => ({ ...blocks, activeBlockId: 2 }), start + 600000);
  state = updateSessionBlocks(state, (blocks) => removeBlock(blocks, 1), start + 900000);
  assert.equal(state.blocks.archivedSpentMs, 600000);
  assert.deepEqual(state.blocks.blockSpent, { 2: 300000 });
  state = advanceSession(state, start + 901000);
  assert.deepEqual(state.blocks.blockSpent, { 2: 301000 });

  const restored = normalizeAppState(JSON.parse(JSON.stringify(state)));
  state = advanceSession(restored, start + 960000);
  assert.equal(state.blocks.archivedSpentMs, 600000);
  assert.deepEqual(state.blocks.blockSpent, { 2: 360000 });
  assert.equal(state.blockTimer.remainingMs, duration - 960000);
});

test("deleting the active block settles its final partial second before archiving", () => {
  let state = updateSessionBlocks(session(), (blocks) => removeBlock(blocks, 1), start + 1250);
  assert.equal(state.blocks.archivedSpentMs, 1250);
  state = advanceSession(state, start + 1500);
  assert.deepEqual(state.blocks.blockSpent, { 2: 250 });
  assert.equal(removeBlock(state.blocks, 1).archivedSpentMs, 1250);
  assert.equal(replaceSessionBlocks(state, state.blocks).blocks.archivedSpentMs, 0);
});

test("legacy saves load without archived time and invalid archived values are sanitized", () => {
  const state = session();
  delete state.blocks.archivedSpentMs;
  assert.equal(normalizeAppState(state).blocks.archivedSpentMs, 0);
  state.blocks.archivedSpentMs = -1;
  assert.equal(normalizeAppState(state).blocks.archivedSpentMs, 0);
});

