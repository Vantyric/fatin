import { describe, it, expect } from "vitest";
import { formatWesternDate } from "./dateFormat";

describe("formatWesternDate", () => {
  it("formats date to YYYY/M/D using Western digits (0-9)", () => {
    // 2026-11-08
    const date = new Date(2026, 10, 8); // month is 0-indexed: 10 = November
    const formatted = formatWesternDate(date);
    expect(formatted).toBe("2026/11/8");
  });

  it("handles ISO date strings and produces Western digits", () => {
    const formatted = formatWesternDate("2026-11-08T12:00:00Z");
    expect(formatted).toMatch(/^2026\/11\/\d+$/);
    // Ensure no Eastern Arabic-Indic numerals (٠-٩)
    expect(formatted).not.toMatch(/[\u0660-\u0669]/);
  });

  it("handles timestamps", () => {
    const ts = new Date(2025, 0, 15).getTime();
    expect(formatWesternDate(ts)).toBe("2025/1/15");
  });

  it("returns empty string on invalid dates", () => {
    expect(formatWesternDate("invalid-date")).toBe("");
  });
});
