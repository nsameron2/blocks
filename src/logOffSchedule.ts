import { addDays, format, getDay, set as setDateParts, startOfMinute } from "date-fns";

export type TimeOfDay = string;
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface LogOffSchedule {
  defaultTime: TimeOfDay;
  weekdayOverrides: Partial<Record<Weekday, TimeOfDay>>;
  dateOverrides: Record<string, TimeOfDay>;
}

export const DEFAULT_LOG_OFF_SCHEDULE: LogOffSchedule = {
  defaultTime: "",
  weekdayOverrides: {},
  dateOverrides: {},
};

function parseTimeOfDay(time: TimeOfDay) {
  const match = time.match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return { hours, minutes };
}

function parseDateKey(dateKey: string) {
  const match = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

export function dateKeyFor(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function logOffDateForDate(schedule: LogOffSchedule, date: Date) {
  const time = resolveLogOffTimeForDate(schedule, date);
  const parsedTime = time ? parseTimeOfDay(time) : null;
  if (!parsedTime) return null;

  return setDateParts(startOfMinute(date), {
    hours: parsedTime.hours,
    minutes: parsedTime.minutes,
    seconds: 0,
    milliseconds: 0,
  });
}

export function resolveLogOffTimeForDate(
  schedule: LogOffSchedule,
  date: Date,
): TimeOfDay | null {
  const dateOverride = schedule.dateOverrides[dateKeyFor(date)];
  if (dateOverride && parseTimeOfDay(dateOverride)) return dateOverride;

  const weekdayOverride = schedule.weekdayOverrides[getDay(date) as Weekday];
  if (weekdayOverride && parseTimeOfDay(weekdayOverride)) return weekdayOverride;

  return parseTimeOfDay(schedule.defaultTime) ? schedule.defaultTime : null;
}

export function resolveNextLogOffDate(
  schedule: LogOffSchedule,
  from = new Date(),
): Date | null {
  const fromTime = from.getTime();
  const candidates: Date[] = [];

  for (let dayOffset = 0; dayOffset <= 7; dayOffset += 1) {
    const candidate = logOffDateForDate(schedule, addDays(from, dayOffset));
    if (candidate && candidate.getTime() > fromTime) {
      candidates.push(candidate);
    }
  }

  for (const [dateKey, time] of Object.entries(schedule.dateOverrides)) {
    const date = parseDateKey(dateKey);
    const parsedTime = parseTimeOfDay(time);
    if (!date || !parsedTime) continue;

    const candidate = setDateParts(startOfMinute(date), {
      hours: parsedTime.hours,
      minutes: parsedTime.minutes,
      seconds: 0,
      milliseconds: 0,
    });

    if (candidate.getTime() > fromTime) {
      candidates.push(candidate);
    }
  }

  if (candidates.length === 0) return null;

  return candidates.reduce((earliest, candidate) =>
    candidate.getTime() < earliest.getTime() ? candidate : earliest,
  );
}
