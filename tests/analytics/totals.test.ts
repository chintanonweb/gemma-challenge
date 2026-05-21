import { describe, it, expect } from "vitest";
import { totalByCategory, monthOverMonth, headlineStats } from "@/lib/analytics/totals";
import type { Category, Transaction } from "@/lib/types";

const tx = (date: string, amount: number, category?: Category): Transaction => ({
  id: date + amount + (category ?? ""),
  date,
  merchant: "X",
  rawDescription: "X",
  amount,
  category,
});

describe("analytics/totals", () => {
  it("totalByCategory sums spend per category and excludes income", () => {
    const stats = totalByCategory([
      tx("2026-01-01", -10, "groceries"),
      tx("2026-01-02", -5, "groceries"),
      tx("2026-01-03", -20, "restaurants"),
      tx("2026-01-04", 1000, "income"),
    ]);
    expect(stats.find((s) => s.category === "groceries")?.total).toBe(-15);
    expect(stats.find((s) => s.category === "restaurants")?.total).toBe(-20);
    expect(stats.find((s) => s.category === "income")).toBeUndefined();
  });

  it("monthOverMonth returns last two months and percent change", () => {
    const txs = [
      tx("2026-02-15", -100),
      tx("2026-02-20", -50),
      tx("2026-03-10", -200),
    ];
    const mom = monthOverMonth(txs);
    expect(mom.previousMonth).toBe(-150);
    expect(mom.currentMonth).toBe(-200);
    expect(mom.deltaPct).toBeCloseTo(33.33, 1);
  });

  it("headlineStats reports total spend, total income, net", () => {
    const h = headlineStats([
      tx("2026-01-01", -100),
      tx("2026-01-02", 500),
      tx("2026-01-03", -150),
    ]);
    expect(h.totalSpend).toBe(-250);
    expect(h.totalIncome).toBe(500);
    expect(h.net).toBe(250);
  });

  it("monthOverMonth handles a single month gracefully", () => {
    const txs = [tx("2026-03-01", -100), tx("2026-03-15", -50)];
    const mom = monthOverMonth(txs);
    expect(mom.previousMonth).toBe(0);
    expect(mom.currentMonth).toBe(0);
    expect(mom.deltaPct).toBe(0);
  });
});
