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
    <section className="flow-root min-h-screen px-6 pt-10" aria-label="Calendar">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3">
          <label
            className="text-xl font-semibold text-white"
            htmlFor="global-log-off-time"
          >
            Global:
          </label>
          <input
            id="global-log-off-time"
            type="time"
            value={draftDefaultTime}
            onChange={(event) => setDraftDefaultTime(event.target.value)}
            className="h-11 min-w-0 flex-1 rounded-md bg-neutral-800 px-3 text-base font-semibold text-white ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-white/50"
          />
        </div>
        <button
          type="button"
          onClick={saveDefaultTime}
          className="mt-3 inline-flex h-10 w-24 cursor-pointer items-center justify-center rounded-md bg-white text-sm font-bold text-neutral-950 transition-colors hover:bg-neutral-200 focus:outline-none focus:ring-2 focus:ring-white/70"
        >
          Save
        </button>
      </div>
    </section>
  );
}
