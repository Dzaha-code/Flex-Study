/**
 * Primitive time types live here so this module has no import cycle with
 * `types.ts`; the rest of the data model depends on them, never the reverse.
 */

/** A local calendar day, `YYYY-MM-DD`. */
export type ISODate = string;

/** A local time of day, `HH:mm`. */
export type ClockTime = string;

/** Minutes elapsed since local midnight, 0 … 1439. */
export type MinuteOfDay = number;

export const MINUTES_PER_DAY = 24 * 60;
export const MINUTES_PER_WEEK = 7 * MINUTES_PER_DAY;

const CLOCK_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

/** Local calendar day of an instant, as `YYYY-MM-DD`. */
export function toISODate(date: Date): ISODate {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/**
 * Local midnight of a calendar day.
 *
 * Deliberately built from year/month/day parts: `new Date("2026-10-14")` parses
 * as UTC and would shift the day for anyone east or west of Greenwich.
 */
export function fromISODate(iso: ISODate): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function todayISO(epochMs: number): ISODate {
  return toISODate(new Date(epochMs));
}

export function addDays(iso: ISODate, amount: number): ISODate {
  const date = fromISODate(iso);
  date.setDate(date.getDate() + amount);
  return toISODate(date);
}

/** Whole days from `from` to `to`. Sign follows the direction. */
export function diffInDays(from: ISODate, to: ISODate): number {
  const a = fromISODate(from);
  const b = fromISODate(to);
  const aUtc = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const bUtc = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((bUtc - aUtc) / 86_400_000);
}

/** 0 = Sunday … 6 = Saturday. */
export function weekdayIndex(iso: ISODate): number {
  return fromISODate(iso).getDay();
}

export function compareISODate(a: ISODate, b: ISODate): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export function startOfWeek(iso: ISODate, weekStart: 0 | 1): ISODate {
  const current = weekdayIndex(iso);
  const delta = (current - weekStart + 7) % 7;
  return addDays(iso, -delta);
}

/** The seven days of the week that contains `iso`, in calendar order. */
export function weekDates(startISO: ISODate): ISODate[] {
  return Array.from({ length: 7 }, (_, index) => addDays(startISO, index));
}

export function isSameWeek(a: ISODate, b: ISODate, weekStart: 0 | 1): boolean {
  return startOfWeek(a, weekStart) === startOfWeek(b, weekStart);
}

export function parseClock(value: ClockTime): MinuteOfDay {
  const match = CLOCK_PATTERN.exec(value);
  if (!match) {
    throw new Error(`Invalid clock time: ${value}`);
  }
  return Number(match[1]) * 60 + Number(match[2]);
}

export function tryParseClock(value: string | null | undefined): MinuteOfDay | null {
  if (!value) return null;
  return CLOCK_PATTERN.test(value) ? parseClock(value) : null;
}

export function formatClock(minutes: MinuteOfDay): ClockTime {
  const safe = ((Math.round(minutes) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  return `${pad2(Math.floor(safe / 60))}:${pad2(safe % 60)}`;
}

export function clampMinuteOfDay(minutes: number): MinuteOfDay {
  return Math.min(MINUTES_PER_DAY - 1, Math.max(0, Math.round(minutes)));
}

/** Minute of day for an instant, in local time. */
export function minuteOfDayFromEpoch(epochMs: number): MinuteOfDay {
  const date = new Date(epochMs);
  return date.getHours() * 60 + date.getMinutes();
}

export function initialSettingsFromWeekStart(weekStart: 0 | 1): string {
  return weekStart === 1 ? "monday" : "sunday";
}

/** `MM:SS` below an hour, `H:MM:SS` above it. Never negative. */
export function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return hours > 0
    ? `${hours}:${pad2(minutes)}:${pad2(seconds)}`
    : `${pad2(minutes)}:${pad2(seconds)}`;
}

export interface DurationParts {
  hours: number;
  minutes: number;
}

export function durationParts(totalMinutes: number): DurationParts {
  const safe = Math.max(0, Math.round(totalMinutes));
  return { hours: Math.floor(safe / 60), minutes: safe % 60 };
}

/** Rounds up to the next multiple of `step`, leaving exact values alone. */
export function ceilToStep(value: number, step: number): number {
  if (step <= 1) return Math.ceil(value);
  return Math.ceil(value / step) * step;
}
