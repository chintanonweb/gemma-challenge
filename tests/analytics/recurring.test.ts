import { describe, it, expect } from "vitest";
import { findRecurring } from "@/lib/analytics/recurring";
import type { Transaction } from "@/lib/types";

const make = (date: string, merchant: string, amount: number): Transaction => ({
  id: `${date}-${merchant}`,
  date,
  merchant,
  rawDescription: merchant,
  amount,
});

describe("findRecurring", () => {
  it("detects a monthly subscription with 3+ occurrences", () => {
    const txs = [
      make("2026-01-15", "NETFLIX", -15.99),
      make("2026-02-15", "NETFLIX", -15.99),
      make("2026-03-15", "NETFLIX", -15.99),
    ];
    const r = findRecurring(txs);
    expect(r).toHaveLength(1);
    expect(r[0].merchant).toBe("NETFLIX");
    expect(r[0].cadenceDays).toBeGreaterThanOrEqual(28);
    expect(r[0].cadenceDays).toBeLessThanOrEqual(32);
    expect(r[0].annualTotal).toBeCloseTo(15.99 * 12, 1);
  });

  it("ignores merchants with only 2 occurrences", () => {
    const txs = [
      make("2026-01-15", "ONCE", -10),
      make("2026-02-15", "ONCE", -10),
    ];
    expect(findRecurring(txs)).toHaveLength(0);
  });

  it("ignores income (positive amounts)", () => {
    const txs = [
      make("2026-01-15", "PAYROLL", 5000),
      make("2026-02-15", "PAYROLL", 5000),
      make("2026-03-15", "PAYROLL", 5000),
    ];
    expect(findRecurring(txs)).toHaveLength(0);
  });

  it("tolerates ±2 day cadence drift", () => {
    const txs = [
      make("2026-01-15", "SPOTIFY", -9.99),
      make("2026-02-13", "SPOTIFY", -9.99),
      make("2026-03-17", "SPOTIFY", -9.99),
    ];
    expect(findRecurring(txs)).toHaveLength(1);
  });

  it("returns results sorted by annual total descending", () => {
    const txs = [
      make("2026-01-01", "CHEAP", -2),
      make("2026-02-01", "CHEAP", -2),
      make("2026-03-01", "CHEAP", -2),
      make("2026-01-05", "PRICEY", -50),
      make("2026-02-05", "PRICEY", -50),
      make("2026-03-05", "PRICEY", -50),
    ];
    const r = findRecurring(txs);
    expect(r[0].merchant).toBe("PRICEY");
    expect(r[1].merchant).toBe("CHEAP");
  });

  it("handles weekly cadence", () => {
    const txs = [
      make("2026-01-05", "GYM", -25),
      make("2026-01-12", "GYM", -25),
      make("2026-01-19", "GYM", -25),
      make("2026-01-26", "GYM", -25),
    ];
    const r = findRecurring(txs);
    expect(r).toHaveLength(1);
    expect(r[0].cadenceDays).toBeGreaterThanOrEqual(6);
    expect(r[0].cadenceDays).toBeLessThanOrEqual(8);
  });
});
