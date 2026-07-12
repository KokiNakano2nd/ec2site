import { describe, expect, it } from "vitest";
import { fmt, fmtDate, statusConfig } from "./format";
import { ORDER_STATUSES } from "./constants";

describe("fmt", () => {
  it("rounds and formats with ja-JP thousands separators", () => {
    expect(fmt(1234.6)).toBe("1,235");
    expect(fmt(0)).toBe("0");
  });
});

describe("fmtDate", () => {
  it("formats an ISO date string using ja-JP locale", () => {
    const result = fmtDate("2026-01-15T09:30:00Z");
    expect(result).toEqual(expect.any(String));
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("statusConfig", () => {
  it("returns the matching entry for a known status value", () => {
    expect(statusConfig("shipped")).toEqual(ORDER_STATUSES.find((s) => s.value === "shipped"));
  });

  it("falls back to a default config for an unknown status value", () => {
    const result = statusConfig("unknown_status");
    expect(result.label).toBe("unknown_status");
    expect(result.color).toBe("#7c85a8");
  });
});
