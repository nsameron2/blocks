import { useEffect, useState } from "react";
import type { LogOffSchedule } from "./logOffSchedule";

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

  useEffect(() => {
    setDraftDefaultTime(logOffSchedule.defaultTime);
  }, [logOffSchedule.defaultTime]);

  function saveDefaultTime() {
    onLogOffScheduleSave({
      ...logOffSchedule,
      defaultTime: draftDefaultTime,
    });
  }

  return (
    <section
      className="flex min-h-screen justify-center px-8 pt-24"
      aria-label="Calendar"
    >
      <div className="w-full max-w-xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
          <label
            className="shrink-0 text-3xl font-bold text-white sm:text-5xl"
            htmlFor="global-log-off-time"
          >
            Global:
          </label>
          <input
            id="global-log-off-time"
            type="time"
            value={draftDefaultTime}
            onChange={(event) => setDraftDefaultTime(event.target.value)}
            className="h-14 min-w-0 flex-1 rounded-md bg-neutral-800 px-4 font-mono text-2xl font-bold text-white ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-white/50 sm:h-16 sm:text-3xl"
          />
        </div>
        <button
          type="button"
          onClick={saveDefaultTime}
          className="mt-4 inline-flex h-12 w-28 cursor-pointer items-center justify-center rounded-md bg-white text-base font-bold text-neutral-950 transition-colors hover:bg-neutral-200 focus:outline-none focus:ring-2 focus:ring-white/70 sm:h-14 sm:w-36 sm:text-lg"
        >
          Save
        </button>
      </div>
    </section>
  );
}
