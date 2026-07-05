import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { LogOffSchedule, Weekday } from "./logOffSchedule";

const WEEKDAYS: { label: string; value: Weekday }[] = [
  { label: "Monday", value: 1 },
  { label: "Tuesday", value: 2 },
  { label: "Wednesday", value: 3 },
  { label: "Thursday", value: 4 },
  { label: "Friday", value: 5 },
  { label: "Saturday", value: 6 },
  { label: "Sunday", value: 0 },
];

interface CalendarProps {
  logOffSchedule: LogOffSchedule;
  onLogOffScheduleSave: (schedule: LogOffSchedule) => void;
}

export function Calendar({
  logOffSchedule,
  onLogOffScheduleSave,
}: CalendarProps) {
  const [draftDefaultTime, setDraftDefaultTime] = useState(
    logOffSchedule.defaultTime,
  );
  const [draftWeekdayTimes, setDraftWeekdayTimes] = useState(
    logOffSchedule.weekdayOverrides,
  );

  useEffect(() => {
    setDraftDefaultTime(logOffSchedule.defaultTime);
  }, [logOffSchedule.defaultTime]);

  useEffect(() => {
    setDraftWeekdayTimes(logOffSchedule.weekdayOverrides);
  }, [logOffSchedule.weekdayOverrides]);

  function updateWeekdayTime(weekday: Weekday, time: string) {
    setDraftWeekdayTimes((previous) => ({
      ...previous,
      [weekday]: time,
    }));
  }

  function saveDefaultTime() {
    onLogOffScheduleSave({
      ...logOffSchedule,
      defaultTime: draftDefaultTime,
    });
  }

  function saveWeekdayTimes() {
    const weekdayOverrides: LogOffSchedule["weekdayOverrides"] = {};

    for (const weekday of WEEKDAYS) {
      const time = draftWeekdayTimes[weekday.value] ?? "";
      if (time) {
        weekdayOverrides[weekday.value] = time;
      }
    }

    onLogOffScheduleSave({
      ...logOffSchedule,
      weekdayOverrides,
    });
  }

  return (
    <section
      className="flex min-h-screen justify-center px-8 pt-24"
      aria-label="Calendar"
    >
      <div className="w-full max-w-3xl">
        <h1 className="text-4xl font-bold text-white sm:text-5xl">
          Log Off Schedule
        </h1>

        <div className="mx-auto mt-10 w-full max-w-xl">
          <label
            className="block text-xl font-semibold text-neutral-200"
            htmlFor="global-log-off-time"
          >
            Default time
          </label>
          <input
            id="global-log-off-time"
            type="time"
            value={draftDefaultTime}
            onChange={(event) => setDraftDefaultTime(event.target.value)}
            className="mt-3 h-14 w-full rounded-md bg-neutral-800 px-4 font-mono text-2xl font-bold text-white ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-white/50 sm:h-16 sm:text-3xl"
          />

          <button
            type="button"
            onClick={saveDefaultTime}
            className="mt-4 inline-flex h-12 w-28 cursor-pointer items-center justify-center rounded-md bg-white text-base font-bold text-neutral-950 transition-colors hover:bg-neutral-200 focus:outline-none focus:ring-2 focus:ring-white/70 sm:h-14 sm:w-36 sm:text-lg"
          >
            Save
          </button>

          <h2 className="mt-12 text-xl font-semibold text-neutral-200">
            Weekly overrides
          </h2>
          <div className="mt-3 overflow-hidden rounded-md bg-neutral-800 ring-1 ring-white/10">
            {WEEKDAYS.map((weekday, index) => (
              <div
                key={weekday.value}
                className={`flex items-center justify-between gap-4 px-4 py-3 ${
                  index === 0 ? "" : "border-t border-white/10"
                }`}
              >
                <label
                  className="text-base font-semibold text-neutral-200 sm:text-lg"
                  htmlFor={`weekday-log-off-time-${weekday.value}`}
                >
                  {weekday.label}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id={`weekday-log-off-time-${weekday.value}`}
                    type="time"
                    value={draftWeekdayTimes[weekday.value] ?? ""}
                    onChange={(event) =>
                      updateWeekdayTime(weekday.value, event.target.value)
                    }
                    className="h-11 w-40 rounded-md bg-neutral-900 px-3 font-mono text-lg font-bold text-white ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-white/50"
                  />
                  <button
                    type="button"
                    onClick={() => updateWeekdayTime(weekday.value, "")}
                    disabled={!draftWeekdayTimes[weekday.value]}
                    className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/50 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-neutral-400"
                    aria-label={`Clear ${weekday.label} override`}
                    title="Use default time"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={saveWeekdayTimes}
            className="mt-4 inline-flex h-12 w-28 cursor-pointer items-center justify-center rounded-md bg-white text-base font-bold text-neutral-950 transition-colors hover:bg-neutral-200 focus:outline-none focus:ring-2 focus:ring-white/70 sm:h-14 sm:w-36 sm:text-lg"
          >
            Save
          </button>
        </div>
      </div>
    </section>
  );
}
