import { useEffect, useState } from "react";
import {
  addDays,
  addMinutes,
  format,
  isSameDay,
  set as setDateParts,
  startOfDay,
} from "date-fns";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { X } from "lucide-react";
import {
  dateKeyFor,
  type LogOffSchedule,
  type Weekday,
} from "./logOffSchedule";

const WEEKDAYS: { label: string; value: Weekday }[] = [
  { label: "Monday", value: 1 },
  { label: "Tuesday", value: 2 },
  { label: "Wednesday", value: 3 },
  { label: "Thursday", value: 4 },
  { label: "Friday", value: 5 },
  { label: "Saturday", value: 6 },
  { label: "Sunday", value: 0 },
];

function timeToDate(date: Date, time: string) {
  const match = time.match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  return setDateParts(startOfDay(date), {
    hours,
    minutes,
    seconds: 0,
    milliseconds: 0,
  });
}

function dateFromKey(dateKey: string) {
  const match = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

interface ScheduleProps {
  logOffSchedule: LogOffSchedule;
  onLogOffScheduleSave: (schedule: LogOffSchedule) => void;
}

export function Schedule({
  logOffSchedule,
  onLogOffScheduleSave,
}: ScheduleProps) {
  const [draftDefaultTime, setDraftDefaultTime] = useState(
    logOffSchedule.defaultTime,
  );
  const [draftWeekdayTimes, setDraftWeekdayTimes] = useState(
    logOffSchedule.weekdayOverrides,
  );
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [draftDateOverrideTime, setDraftDateOverrideTime] = useState("");
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    setDraftDefaultTime(logOffSchedule.defaultTime);
  }, [logOffSchedule.defaultTime]);

  useEffect(() => {
    setDraftWeekdayTimes(logOffSchedule.weekdayOverrides);
  }, [logOffSchedule.weekdayOverrides]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30 * 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!selectedDate) return;

    setDraftDateOverrideTime(
      logOffSchedule.dateOverrides[dateKeyFor(selectedDate)] ?? "",
    );
  }, [logOffSchedule.dateOverrides, selectedDate]);

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

  function selectDate(date: Date | undefined) {
    setSelectedDate(date);
    setDraftDateOverrideTime(
      date ? logOffSchedule.dateOverrides[dateKeyFor(date)] ?? "" : "",
    );
  }

  function saveDateOverride() {
    if (!selectedDate || !dateOverrideAt || dateOverrideAt <= now) return;

    onLogOffScheduleSave({
      ...logOffSchedule,
      dateOverrides: {
        ...logOffSchedule.dateOverrides,
        [dateKeyFor(selectedDate)]: draftDateOverrideTime,
      },
    });
  }

  const minimumSelectableDate = startOfDay(now);
  const nextFutureMinute = addMinutes(now, 1);
  const todayHasSelectableTime = isSameDay(nextFutureMinute, now);
  const disabledBeforeDate = todayHasSelectableTime
    ? minimumSelectableDate
    : startOfDay(addDays(now, 1));
  const selectedDateIsToday = selectedDate ? isSameDay(selectedDate, now) : false;
  const dateOverrideAt = selectedDate
    ? timeToDate(selectedDate, draftDateOverrideTime)
    : null;
  const canSaveDateOverride =
    Boolean(selectedDate) && Boolean(dateOverrideAt) && dateOverrideAt! > now;
  const dateOverrideInputDisabled =
    !selectedDate || (selectedDateIsToday && !todayHasSelectableTime);
  const dateOverrideMinTime =
    selectedDateIsToday && todayHasSelectableTime
      ? format(nextFutureMinute, "HH:mm")
      : undefined;
  const selectedDateLabel = selectedDate
    ? format(selectedDate, "MMMM d, yyyy")
    : "Select a date";
  const overriddenDates = Object.keys(logOffSchedule.dateOverrides)
    .map(dateFromKey)
    .filter((date): date is Date => Boolean(date));

  return (
    <section
      className="flex min-h-screen justify-center px-8 pb-24 pt-24"
      aria-label="Schedule"
    >
      <div className="w-full max-w-3xl">
        <h1 className="text-4xl font-bold text-white sm:text-5xl">
          Log Off Schedule
        </h1>

        <div className="mx-auto mt-10 w-full max-w-2xl space-y-10">
          <section>
            <h2 className="text-xl font-semibold text-neutral-200">
              Default time
            </h2>
            <div className="mt-3 overflow-hidden rounded-md bg-neutral-800 ring-1 ring-white/10">
              <div className="flex min-h-20 flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <label
                  className="text-base font-semibold text-neutral-200 sm:text-lg"
                  htmlFor="global-log-off-time"
                >
                  Time
                </label>
                <div className="flex w-full items-center gap-3 sm:w-auto">
                  <input
                    id="global-log-off-time"
                    type="time"
                    value={draftDefaultTime}
                    onChange={(event) => setDraftDefaultTime(event.target.value)}
                    className="h-12 min-w-0 flex-1 rounded-md bg-neutral-900 px-3 font-mono text-xl font-bold text-white ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-white/50 sm:w-44 sm:flex-none"
                  />
                  <button
                    type="button"
                    onClick={saveDefaultTime}
                    className="inline-flex h-12 w-24 shrink-0 cursor-pointer items-center justify-center rounded-md bg-white text-base font-bold text-neutral-950 transition-colors hover:bg-neutral-200 focus:outline-none focus:ring-2 focus:ring-white/70"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-200">
              Weekly overrides
            </h2>
            <div className="mt-3 overflow-hidden rounded-md bg-neutral-800 ring-1 ring-white/10">
              {WEEKDAYS.map((weekday, index) => (
                <div
                  key={weekday.value}
                  className={`flex min-h-16 flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
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
                      className="h-12 min-w-0 flex-1 rounded-md bg-neutral-900 px-3 font-mono text-xl font-bold text-white ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-white/50 sm:w-44 sm:flex-none"
                    />
                    <button
                      type="button"
                      onClick={() => updateWeekdayTime(weekday.value, "")}
                      disabled={!draftWeekdayTimes[weekday.value]}
                      className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/50 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-neutral-400"
                      aria-label={`Clear ${weekday.label} override`}
                      title="Use default time"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              <div className="flex justify-end border-t border-white/10 px-4 py-6">
                <button
                  type="button"
                  onClick={saveWeekdayTimes}
                  className="inline-flex h-12 w-32 cursor-pointer items-center justify-center rounded-md bg-white text-base font-bold text-neutral-950 transition-colors hover:bg-neutral-200 focus:outline-none focus:ring-2 focus:ring-white/70"
                >
                  Save weekly
                </button>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-200">
              Date overrides
            </h2>
            <div className="mt-3 overflow-hidden rounded-md bg-neutral-800 ring-1 ring-white/10">
              <div className="px-4 py-4">
                <DayPicker
                  mode="single"
                  selected={selectedDate}
                  onSelect={selectDate}
                  disabled={{ before: disabledBeforeDate }}
                  defaultMonth={selectedDate ?? now}
                  modifiers={{ overridden: overriddenDates }}
                  modifiersClassNames={{ overridden: "rdp-overridden" }}
                  className="log-off-date-picker"
                />
              </div>

              <div className="grid gap-3 border-t border-white/10 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_176px_112px] sm:items-center">
                <div className="min-w-0">
                  <label
                    className="block text-base font-semibold text-neutral-200 sm:text-lg"
                    htmlFor="date-log-off-time"
                  >
                    Selected date
                  </label>
                  <p className="mt-1 truncate text-sm font-medium text-neutral-400">
                    {selectedDateLabel}
                  </p>
                </div>
                <input
                  id="date-log-off-time"
                  type="time"
                  value={draftDateOverrideTime}
                  min={dateOverrideMinTime}
                  disabled={dateOverrideInputDisabled}
                  onChange={(event) =>
                    setDraftDateOverrideTime(event.target.value)
                  }
                  className="h-12 min-w-0 rounded-md bg-neutral-900 px-3 font-mono text-xl font-bold text-white ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-white/50 disabled:cursor-not-allowed disabled:opacity-40"
                />
                <button
                  type="button"
                  onClick={saveDateOverride}
                  disabled={!canSaveDateOverride}
                  className="inline-flex h-12 w-full cursor-pointer items-center justify-center rounded-md bg-white text-base font-bold text-neutral-950 transition-colors hover:bg-neutral-200 focus:outline-none focus:ring-2 focus:ring-white/70 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-400 disabled:hover:bg-neutral-700"
                >
                  Save date
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
