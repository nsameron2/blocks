const test = require("node:test");
const assert = require("node:assert/strict");
const { loadTypeScript, elements } = require("./helpers.cjs");

function timerAt(t, now, target, timeFormat = "24h") {
  const NativeDate = Date;
  class FixedDate extends NativeDate {
    constructor(...args) { super(...(args.length ? args : [now.getTime()])); }
    static now() { return now.getTime(); }
  }
  globalThis.Date = FixedDate;
  t.after(() => { globalThis.Date = NativeDate; });

  const values = [];
  let index = 0;
  const { Timer } = loadTypeScript("src/components/Timer.tsx", {
    react: {
      useState(initial) {
        const slot = index++;
        values[slot] = typeof initial === "function" ? initial() : initial;
        return [values[slot], (update) => {
          values[slot] = typeof update === "function" ? update(values[slot]) : update;
        }];
      },
      useRef: (current) => ({ current }),
      useEffect() {},
    },
    "lucide-react": {},
    "../lib/completionSounds": {},
    "../lib/notifications": {},
    "../lib/soundPlayer": {},
  });
  const nodes = elements(Timer({
    state: { targetAt: target.toISOString(), started: false, totalDurationMs: 0, remainingMs: 0 },
    onStateChange() {}, onStart() {}, onReset() {}, onAppReset() {},
    totalAllocationPercent: 100, timeFormat, notificationVolume: 0,
    completionSounds: {}, customSounds: [],
  }));
  return {
    quick: nodes.find((node) => node.type?.name === "QuickOffset").props,
    spinner: nodes.find((node) => node.type?.name === "TimeField").props,
    target: () => values[0].at,
  };
}

for (const timeFormat of ["12h", "24h"]) {
  for (const control of ["quick", "spinner"]) {
    test(`${control} +2h preserves tomorrow's date in ${timeFormat} mode`, (t) => {
      const timer = timerAt(t, new Date(2026, 10, 9, 9), new Date(2026, 10, 10, 8), timeFormat);
      timer[control].onShift(120);
      assert.equal(timer.target().getTime(), new Date(2026, 10, 10, 10).getTime());
    });
  }
}

test("adding and subtracting across midnight preserves the intended day", (t) => {
  const timer = timerAt(t, new Date(2026, 10, 9, 9), new Date(2026, 10, 9, 23));
  timer.quick.onShift(120);
  assert.equal(timer.target().getTime(), new Date(2026, 10, 10, 1).getTime());
  timer.quick.onShift(-120);
  assert.equal(timer.target().getTime(), new Date(2026, 10, 9, 23).getTime());
});

test("adjusting a future scheduled date does not pull it back to today", (t) => {
  const timer = timerAt(t, new Date(2026, 10, 9, 9), new Date(2026, 10, 16, 17));
  timer.quick.onShift(-120);
  assert.equal(timer.target().getTime(), new Date(2026, 10, 16, 15).getTime());
});

test("quick subtraction cannot move the deadline into the past", (t) => {
  const target = new Date(2026, 10, 9, 9, 30);
  const timer = timerAt(t, new Date(2026, 10, 9, 9), target);
  assert.equal(timer.quick.canShift(-30), false);
  timer.quick.onShift(-30);
  assert.equal(timer.target().getTime(), target.getTime());
});
