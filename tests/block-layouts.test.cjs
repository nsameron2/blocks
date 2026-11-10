const test = require("node:test");
const assert = require("node:assert/strict");
const { loadTypeScript, elements } = require("./helpers.cjs");
const { createDefaultAppState } = loadTypeScript("src/lib/appState.ts");
const { replaceSessionBlocks } = loadTypeScript("src/lib/session.ts");

test("both reset and preset controls replace the running session atomically", () => {
  for (const action of ["reset", "preset"]) {
    let state = createDefaultAppState();
    state.blockTimer = {
      started: true, targetAt: "2026-11-09T10:00:00Z",
      totalDurationMs: 3600000, remainingMs: 1800000,
    };
    state.blocks.blockSpent = { 1: 1800000 };
    state.blocks.presets = [{ id: 1, name: "Workday", blocks: [{ ...state.blocks.blocks[0], percent: 100 }] }];
    let stateIndex = 0;
    const { BlockManager } = loadTypeScript("src/components/BlockManager.tsx", {
      react: {
        useState: (initial) => [stateIndex++ === 2 ? true : initial, () => {}],
        useRef: (current) => ({ current }),
        useCallback: (fn) => fn,
        useEffect() {},
      },
      "canvas-confetti": () => {},
      "lucide-react": { ChevronDown: "ChevronDown", RefreshCw: "RefreshCw", Save: "Save", Trash2: "Trash2" },
      "../lib/blockAutocomplete": {},
      "../lib/completionSounds": {},
      "../lib/notifications": {},
      "../lib/soundPlayer": {},
      "./Block": { Block: "Block" },
      "./Muxer": { Muxer: "Muxer" },
    });
    const tree = BlockManager({
      blocksState: state.blocks,
      onBlocksStateChange: () => assert.fail("layout replacement must also reset the timer"),
      onReplaceBlocks: (update) => { state = replaceSessionBlocks(state, update); },
      totalDurationMs: state.blockTimer.totalDurationMs,
      scheduleStarted: true, aiSettings: {}, completionSounds: {}, customSounds: [],
    });
    const button = elements(tree).find((node) => action === "reset"
      ? node.props?.title === "Reset blocks"
      : node.type === "button" && node.props.children === "Workday");
    assert.ok(button);
    button.props.onClick();
    assert.equal(state.blockTimer.started, false);
    assert.equal(state.blockTimer.targetAt, "2026-11-09T10:00:00Z");
    assert.deepEqual(state.blocks.blockSpent, {});
    assert.equal(state.blocks.blocks[0].percent, action === "reset" ? 25 : 100);
    assert.equal(state.blocks.presets.length, 1);
  }
});
