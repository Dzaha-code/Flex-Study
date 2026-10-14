import { describe, expect, it } from "vitest";
import {
  addDays,
  ceilToStep,
  diffInDays,
  durationParts,
  formatClock,
  formatCountdown,
  fromISODate,
  isSameWeek,
  parseClock,
  startOfWeek,
  toISODate,
  weekDates,
  weekdayIndex,
} from "@/domain/time";

describe("calendar days", () => {
  it("parses a calendar day as local midnight, never UTC", () => {
    const date = fromISODate("2026-01-01");
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(0);
    expect(date.getDate()).toBe(1);
    expect(date.getHours()).toBe(0);
  });

  it("round-trips through toISODate", () => {
    expect(toISODate(fromISODate("2026-10-14"))).toBe("2026-10-14");
  });

  it("adds days across month and year boundaries", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("measures signed day distance", () => {
    expect(diffInDays("2026-10-14", "2026-10-17")).toBe(3);
    expect(diffInDays("2026-10-17", "2026-10-14")).toBe(-3);
    expect(diffInDays("2026-10-14", "2026-10-14")).toBe(0);
  });

  it("knows the weekday index", () => {
    // 2026-10-14 is a Wednesday.
    expect(weekdayIndex("2026-10-14")).toBe(3);
  });
});

describe("weeks", () => {
  it("respects a Monday week start", () => {
    expect(startOfWeek("2026-10-14", 1)).toBe("2026-10-12");
  });

  it("respects a Sunday week start", () => {
    expect(startOfWeek("2026-10-14", 0)).toBe("2026-10-11");
  });

  it("returns seven consecutive days", () => {
    const dates = weekDates("2026-10-12");
    expect(dates).toHaveLength(7);
    expect(dates[0]).toBe("2026-10-12");
    expect(dates[6]).toBe("2026-10-18");
  });

  it("groups the same week regardless of the day picked", () => {
    expect(isSameWeek("2026-10-12", "2026-10-18", 1)).toBe(true);
    expect(isSameWeek("2026-10-18", "2026-10-19", 1)).toBe(false);
  });
});

describe("clock times", () => {
  it("round-trips minutes of day", () => {
    expect(parseClock("08:30")).toBe(510);
    expect(formatClock(510)).toBe("08:30");
    expect(formatClock(0)).toBe("00:00");
    expect(formatClock(75)).toBe("01:15");
  });

  it("rejects malformed times instead of guessing", () => {
    expect(() => parseClock("8:30")).toThrow();
    expect(() => parseClock("24:00")).toThrow();
    expect(() => parseClock("10:75")).toThrow();
  });
});

describe("durations", () => {
  it("splits minutes into hours and minutes", () => {
    expect(durationParts(195)).toEqual({ hours: 3, minutes: 15 });
    expect(durationParts(45)).toEqual({ hours: 0, minutes: 45 });
  });

  it("renders a countdown that never goes negative", () => {
    expect(formatCountdown(-5)).toBe("00:00");
    expect(formatCountdown(0)).toBe("00:00");
    expect(formatCountdown(65)).toBe("01:05");
    expect(formatCountdown(3661)).toBe("1:01:01");
  });

  it("rounds up to a slot", () => {
    expect(ceilToStep(612, 5)).toBe(615);
    expect(ceilToStep(615, 5)).toBe(615);
    expect(ceilToStep(616, 15)).toBe(630);
  });
});
