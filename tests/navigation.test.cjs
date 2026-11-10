const test = require("node:test");
const assert = require("node:assert/strict");
const { loadTypeScript, elements } = require("./helpers.cjs");

test("navigation keeps the same timer and block manager mounted", () => {
  const state = [];
  let index = 0;
  const react = {
    useState(initial) {
      const slot = index++;
      if (!(slot in state)) state[slot] = typeof initial === "function" ? initial() : initial;
      return [state[slot], (value) => { state[slot] = value; }];
    },
    useEffect() {},
    useCallback: (fn) => fn,
    useMemo: (fn) => fn(),
  };
  const { default: App } = loadTypeScript("src/App.tsx", {
    react,
    "./Schedule": { Schedule: "Schedule" },
    "./Settings": { Settings: "Settings" },
    "./components/NavigationMenu": { NavigationMenu: "NavigationMenu" },
    "./components/Timer": { Timer: "Timer" },
    "./components/BlockManager": { BlockManager: "BlockManager" },
  });
  const render = () => { index = 0; return App(); };
  const initial = elements(render());
  const page = initial.find((node) => node.type?.name === "BlocksPage");
  assert.ok(page);

  for (const destination of ["settings", "schedule", "blocks"]) {
    initial.find((node) => node.type === "NavigationMenu").props.onPageChange(destination);
    const nodes = elements(render());
    const current = nodes.find((node) => node.type === page.type);
    assert.ok(current, `BlocksPage must remain mounted on ${destination}`);
    assert.equal(current.key, page.key);
    const wrapper = nodes.find((node) => node.props?.children === current);
    assert.equal(wrapper.props.hidden, destination !== "blocks");
  }
});
