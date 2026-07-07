import { describe, it, expect } from "vitest";
import {
  parseSpecialDay,
  formatSpecialDay,
  specialDayLabel,
  daysInMonth,
  daysUntilSpecialDay,
  soonestUpcomingDay,
} from "./special-day";

describe("parseSpecialDay", () => {
  it("parses a valid MM-DD", () => {
    expect(parseSpecialDay("03-14")).toEqual({ month: 3, day: 14 });
  });
  it("returns null for absent or malformed input", () => {
    expect(parseSpecialDay(undefined)).toBeNull();
    expect(parseSpecialDay("")).toBeNull();
    expect(parseSpecialDay("3-14")).toBeNull();
    expect(parseSpecialDay("13-01")).toBeNull(); // no month 13
    expect(parseSpecialDay("02-30")).toBeNull(); // Feb has no 30th
  });
  it("accepts Feb 29", () => {
    expect(parseSpecialDay("02-29")).toEqual({ month: 2, day: 29 });
  });
});

describe("formatSpecialDay", () => {
  it("zero-pads month and day", () => {
    expect(formatSpecialDay(3, 4)).toBe("03-04");
  });
  it("clamps the day to the month length", () => {
    expect(formatSpecialDay(2, 31)).toBe("02-29");
    expect(formatSpecialDay(4, 31)).toBe("04-30");
  });
});

describe("daysInMonth", () => {
  it("gives the forgiving max per month", () => {
    expect(daysInMonth(1)).toBe(31);
    expect(daysInMonth(2)).toBe(29);
    expect(daysInMonth(4)).toBe(30);
  });
});

describe("specialDayLabel", () => {
  it("formats a warm, year-free label", () => {
    expect(specialDayLabel("03-14")).toBe("Mar 14");
    expect(specialDayLabel(undefined)).toBeNull();
  });
});

describe("daysUntilSpecialDay", () => {
  const now = new Date(2026, 6, 7); // Jul 7, 2026

  it("counts days until a later day this year", () => {
    expect(daysUntilSpecialDay("07-12", now)).toBe(5);
  });
  it("is 0 when the day is today", () => {
    expect(daysUntilSpecialDay("07-07", now)).toBe(0);
  });
  it("wraps to next year when the day already passed", () => {
    // Jan 1 from Jul 7 → next Jan 1 is ~178 days out, not negative
    const days = daysUntilSpecialDay("01-01", now)!;
    expect(days).toBeGreaterThan(170);
    expect(days).toBeLessThan(190);
  });
  it("handles the Dec → Jan wrap from late December", () => {
    const dec28 = new Date(2026, 11, 28);
    expect(daysUntilSpecialDay("01-02", dec28)).toBe(5);
  });
  it("returns null for an unusable value", () => {
    expect(daysUntilSpecialDay(undefined, now)).toBeNull();
    expect(daysUntilSpecialDay("nope", now)).toBeNull();
  });
});

describe("soonestUpcomingDay", () => {
  const now = new Date(2026, 6, 7); // Jul 7, 2026

  it("picks the soonest person within the window", () => {
    const people = [
      { id: "a", specialDay: "07-20" }, // 13 days
      { id: "b", specialDay: "07-10" }, // 3 days — soonest
      { id: "c", specialDay: "12-25" }, // far off
    ];
    const upcoming = soonestUpcomingDay(people, 14, now);
    expect(upcoming?.person.id).toBe("b");
    expect(upcoming?.days).toBe(3);
    expect(upcoming?.year).toBe(2026);
  });

  it("returns null when nobody lands within the window", () => {
    const people = [{ id: "a", specialDay: "10-01" }];
    expect(soonestUpcomingDay(people, 14, now)).toBeNull();
  });

  it("ignores people without a special day", () => {
    const people = [{ id: "a" }, { id: "b", specialDay: "07-09" }];
    const upcoming = soonestUpcomingDay(people, 14, now);
    expect(upcoming?.person.id).toBe("b");
  });

  it("tags the occurrence with next year across the wrap", () => {
    const dec28 = new Date(2026, 11, 28);
    const people = [{ id: "a", specialDay: "01-02" }];
    const upcoming = soonestUpcomingDay(people, 14, dec28);
    expect(upcoming?.person.id).toBe("a");
    expect(upcoming?.year).toBe(2027);
  });
});
