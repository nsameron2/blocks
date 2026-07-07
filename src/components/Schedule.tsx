import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  addDays,
  addHours,
  addMinutes,
  differenceInCalendarDays,
  differenceInMilliseconds,
  format,
  formatDuration,
  getHours,
  getMinutes,
  intervalToDuration,
  roundToNearestMinutes,
  set as setDateParts,
  startOfMinute,
} from "date-fns";
import {
  ChevronDown,
  ChevronUp,
  Minus,
  Play,
  Plus,
  Trash2,
} from "lucide-react";
import type { BlockTimerState } from "../lib/appState";

const MINUTE_STEP = 5;
const DEFAULT_OFFSET_MINUTES = 90;
const QUICK_OFFSETS = [
  { label: "30m", minutes: 30 },
  { label: "1h", minutes: 60 },
  { label: "90m", minutes: 90 },
  { label: "2h", minutes: 120 },
];
const TIME_BUTTON_CLASS =
  "flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-[var(--app-subtle)] transition-colors hover:bg-[var(--app-hover)] focus:outline-none";
const QUICK_BUTTON_CLASS =
  "flex cursor-pointer items-center justify-center transition-colors hover:bg-[var(--app-hover)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent";

type ClockPart = "hour" | "minute";

interface ClockState {
  at: Date;
  hour: string;
  minute: string;
}

function clockState(clockTime: Date, from = new Date()) {
  const today = setDateParts(startOfMinute(from), {
    hours: getHours(clockTime),
    minutes: getMinutes(clockTime),
    seconds: 0,
    milliseconds: 0,
  });
  const at = today > from ? today : addDays(today, 1);

  return { at, hour: format(at, "hh"), minute: format(at, "mm") };
}

function exactClockState(targetAt: Date) {
  const at = startOfMinute(targetAt);

  return { at, hour: format(at, "hh"), minute: format(at, "mm") };
}

function clockStateFromTarget(targetAt: Date, from = new Date()) {
  return targetAt > from ? exactClockState(targetAt) : clockState(targetAt, from);
}

function defaultClock(from = new Date()) {
  return clockState(
    roundToNearestMinutes(addMinutes(from, DEFAULT_OFFSET_MINUTES), {
      nearestTo: MINUTE_STEP,
      roundingMethod: "ceil",
    }),
    from,
  );
}

function dateFromIso(value: string | null) {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function countdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor(total / 60) % 60;
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function targetLabel(targetAt: Date, now: Date) {
  const day = differenceInCalendarDays(targetAt, now);
  const dayLabel = day === 0 ? "Today" : day === 1 ? "Tomorrow" : format(targetAt, "MMM d");
  const distance = formatDuration(intervalToDuration({ start: now, end: targetAt }), {
    format: ["hours", "minutes"],
  });

  return `${dayLabel} | ${distance || "less than a minute"}`;
}

function TimeField({
  label,
  value,
  step,
  onChange,
  onShift,
}: {
  label: string;
  value: string;
  step: number;
  onChange: (value: string) => void;
  onShift: (minutes: number) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center rounded-md bg-[var(--app-surface-2)] px-2 py-2 ring-1 ring-[var(--app-border)]">
      <button
        type="button"
        onClick={() => onShift(step)}
        className={TIME_BUTTON_CLASS}
        aria-label={`Increase ${label}`}
      >
        <ChevronUp className="h-5 w-5" />
      </button>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={2}
        value={value}
        onFocus={(e) => e.currentTarget.select()}
        onClick={(e) => e.currentTarget.select()}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(-2))}
        aria-label={`Edit ${label}`}
        className="h-16 w-full min-w-0 cursor-text bg-transparent px-0 text-center font-mono text-4xl font-bold leading-none tabular-nums text-[var(--app-text)] outline-none sm:text-6xl"
      />
      <button
        type="button"
        onClick={() => onShift(-step)}
        className={TIME_BUTTON_CLASS}
        aria-label={`Decrease ${label}`}
      >
        <ChevronDown className="h-5 w-5" />
      </button>
      <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--app-muted)]">
        {label}
      </span>
    </div>
  );
}

function QuickOffset({
  label,
  minutes,
  canShift,
  onShift,
}: {
  label: string;
  minutes: number;
  canShift: (minutes: number) => boolean;
  onShift: (minutes: number) => void;
}) {
  return (
    <div className="grid h-10 grid-cols-[32px_1fr_32px] overflow-hidden rounded-md bg-[var(--app-surface-2)] text-sm font-semibold text-[var(--app-subtle)] ring-1 ring-[var(--app-border)]">
      <button
        type="button"
        onClick={() => onShift(-minutes)}
        disabled={!canShift(-minutes)}
        className={QUICK_BUTTON_CLASS}
        aria-label={`Subtract ${label}`}
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className="flex items-center justify-center tabular-nums">{label}</span>
      <button
        type="button"
        onClick={() => onShift(minutes)}
        disabled={!canShift(minutes)}
        className={QUICK_BUTTON_CLASS}
        aria-label={`Add ${label}`}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

function AppResetButton({ onReset }: { onReset: () => void }) {
  return (
    <button
      type="button"
      onClick={onReset}
      className="mt-3 inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-md text-red-400 hover:text-red-500 sm:absolute sm:left-full sm:top-0 sm:ml-3 sm:mt-0"
      aria-label="Reset app"
      title="Reset app"
    >
      <Trash2 className="h-5 w-5" />
    </button>
  );
}

export function Schedule({
  state,
  onStateChange,
  onAppReset,
  totalAllocationPercent,
  targetLogOffAt,
}: {
  state: BlockTimerState;
  onStateChange: Dispatch<SetStateAction<BlockTimerState>>;
  onAppReset: () => void;
  totalAllocationPercent: number;
  targetLogOffAt?: Date | null;
}) {
  const targetLogOffAtMs = targetLogOffAt?.getTime() ?? null;
  const stateTargetAt = dateFromIso(state.targetAt);
  const stateTargetAtMs = stateTargetAt?.getTime() ?? null;
  const previousTargetLogOffAtMsRef = useRef<number | null>(targetLogOffAtMs);
  const [clock, setClock] = useState<ClockState>(() => {
    if (stateTargetAt) return clockStateFromTarget(stateTargetAt);
    return targetLogOffAt ? exactClockState(targetLogOffAt) : defaultClock();
  });
  const [now, setNow] = useState(() => new Date());
  const started = state.started;
  const remaining = state.remainingMs;

  const allocationComplete = totalAllocationPercent === 100;
  const targetAt = clock.at > now ? clock.at : clockState(clock.at, now).at;
  const targetAtIso = targetAt.toISOString();

  function shift(minutes: number) {
    setClock((prev) => {
      const current = new Date();
      const currentTarget =
        prev.at > current ? prev.at : clockState(prev.at, current).at;

      return exactClockState(addMinutes(currentTarget, minutes));
    });
  }

  function edit(part: ClockPart, text: string) {
    setClock((prev) => {
      if (!text || (part === "hour" && text === "0")) return { ...prev, [part]: text };

      const isHour = part === "hour";
      const raw = Number(text);
      const value = Math.min(isHour ? 12 : 59, Math.max(isHour ? 1 : 0, raw));
      const at = setDateParts(
        prev.at,
        isHour
          ? { hours: (value % 12) + (format(prev.at, "a") === "PM" ? 12 : 0) }
          : { minutes: value },
      );
      const next = at > new Date() ? exactClockState(at) : clockState(at);

      return raw === value ? { ...next, [part]: text } : next;
    });
  }

  function canQuickShift(minutes: number) {
    const shifted = addMinutes(targetAt, minutes);
    return shifted > now;
  }

  function quickShift(minutes: number) {
    const current = new Date();

    setNow(current);
    setClock((prev) => {
      const currentTarget =
        prev.at > current ? prev.at : clockState(prev.at, current).at;
      const shifted = addMinutes(currentTarget, minutes);
      return shifted > current
        ? exactClockState(shifted)
        : prev;
    });
  }

  function reset() {
    const current = new Date();
    const nextClock = defaultClock(current);

    setNow(current);
    setClock(nextClock);
    onStateChange({
      targetAt: nextClock.at.toISOString(),
      started: false,
      totalDurationMs: 0,
      remainingMs: 0,
    });
  }

  function resetApp() {
    const current = new Date();

    setNow(current);
    setClock(defaultClock(current));
    onAppReset();
  }

  function start() {
    if (!allocationComplete) return;

    const current = new Date();
    const scheduledAt =
      clock.at > current ? clock.at : clockState(clock.at, current).at;
    const durationMs = differenceInMilliseconds(scheduledAt, current);

    onStateChange({
      targetAt: scheduledAt.toISOString(),
      started: true,
      totalDurationMs: durationMs,
      remainingMs: durationMs,
    });
  }

  useEffect(() => {
    if (started || stateTargetAtMs === null) return;

    const current = new Date();

    setNow(current);
    setClock(clockStateFromTarget(new Date(stateTargetAtMs), current));
  }, [started, stateTargetAtMs]);

  useEffect(() => {
    if (started || targetLogOffAtMs === null) return;

    const previousTargetLogOffAtMs = previousTargetLogOffAtMsRef.current;
    previousTargetLogOffAtMsRef.current = targetLogOffAtMs;

    if (previousTargetLogOffAtMs === targetLogOffAtMs) return;

    onStateChange({
      targetAt: new Date(targetLogOffAtMs).toISOString(),
      started: false,
      totalDurationMs: 0,
      remainingMs: 0,
    });
  }, [onStateChange, started, targetLogOffAtMs]);

  useEffect(() => {
    if (started) return;

    onStateChange((previous) => {
      if (
        previous.targetAt === targetAtIso &&
        previous.started === false &&
        previous.totalDurationMs === 0 &&
        previous.remainingMs === 0
      ) {
        return previous;
      }

      return {
        targetAt: targetAtIso,
        started: false,
        totalDurationMs: 0,
        remainingMs: 0,
      };
    });
  }, [onStateChange, started, targetAtIso]);

  useEffect(() => {
    if (started) return;

    const timer = setInterval(() => setNow(new Date()), 30 * 1000);
    return () => clearInterval(timer);
  }, [started]);

  useEffect(() => {
    if (!started) return;

    function updateRemaining() {
      onStateChange((previous) => {
        const targetAt = dateFromIso(previous.targetAt);
        const remainingMs = targetAt
          ? Math.max(0, differenceInMilliseconds(targetAt, new Date()))
          : Math.max(0, previous.remainingMs - 1000);
        const nextStarted = remainingMs > 0;

        if (
          previous.remainingMs === remainingMs &&
          previous.started === nextStarted
        ) {
          return previous;
        }

        return { ...previous, started: nextStarted, remainingMs };
      });
    }

    updateRemaining();

    const timer = setInterval(() => {
      updateRemaining();
    }, 1000);
    return () => clearInterval(timer);
  }, [onStateChange, started]);

  return (
    <section className="mx-auto mt-8 w-full max-w-xl px-6 text-[var(--app-text)]">
      {started ? (
        <div className="relative">
          <div className="flex h-24 w-full items-center justify-center rounded-md bg-[var(--app-surface)] px-6 font-mono text-5xl font-bold tabular-nums tracking-wider text-[var(--app-text)] ring-1 ring-[var(--app-border)] sm:text-6xl">
            {countdown(remaining)}
          </div>
          <div className="flex justify-end sm:block">
            <AppResetButton onReset={resetApp} />
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-3">
            <h2 className="text-xl font-semibold">Set log off time:</h2>
            <p className="mt-1 text-sm font-medium text-[var(--app-muted)]">
              {targetLabel(targetAt, now)}
            </p>
          </div>

          <div className="relative">
            <div className="rounded-lg bg-[var(--app-surface)] p-4 shadow-2xl shadow-[var(--app-shadow)] ring-1 ring-[var(--app-border)]">
              <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_58px] items-stretch gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_72px] sm:gap-4">
                <TimeField
                  label="hour"
                  value={clock.hour}
                  step={60}
                  onChange={(value) => edit("hour", value)}
                  onShift={shift}
                />
                <div className="flex items-center pb-7 font-mono text-3xl font-bold text-[var(--app-muted)] sm:text-5xl">
                  :
                </div>
                <TimeField
                  label="min"
                  value={clock.minute}
                  step={MINUTE_STEP}
                  onChange={(value) => edit("minute", value)}
                  onShift={shift}
                />
                <button
                  type="button"
                  onClick={() =>
                    setClock((prev) => exactClockState(addHours(prev.at, 12)))
                  }
                  className="cursor-pointer rounded-md bg-[var(--app-secondary-control)] text-lg font-bold text-[var(--app-text)] ring-1 ring-[var(--app-border)] transition-colors hover:bg-[var(--app-secondary-control-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--app-focus)] sm:text-2xl"
                  aria-label={`Switch to ${format(clock.at, "a") === "AM" ? "PM" : "AM"}`}
                >
                  {format(clock.at, "a")}
                </button>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {QUICK_OFFSETS.map((offset) => (
                  <QuickOffset
                    key={offset.label}
                    {...offset}
                    canShift={canQuickShift}
                    onShift={quickShift}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-end sm:block">
              <AppResetButton onReset={resetApp} />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={reset}
              className="inline-flex h-10 w-28 cursor-pointer items-center justify-center rounded-md bg-[var(--app-secondary-control)] text-sm font-semibold text-[var(--app-subtle)] ring-1 ring-[var(--app-border)] transition-colors hover:bg-[var(--app-secondary-control-hover)] hover:text-[var(--app-text)] focus:outline-none focus:ring-2 focus:ring-[var(--app-focus)]"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={start}
              disabled={!allocationComplete}
              className="inline-flex h-10 w-28 cursor-pointer items-center justify-center gap-2 rounded-md bg-[var(--app-control)] text-sm font-bold text-[var(--app-control-text)] transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--app-focus)] disabled:cursor-not-allowed disabled:bg-[var(--app-disabled)] disabled:text-[var(--app-disabled-text)] disabled:hover:bg-[var(--app-disabled)] disabled:hover:opacity-100 disabled:focus:ring-[var(--app-focus)]"
            >
              <Play className="h-4 w-4 fill-current" />
              Start
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
