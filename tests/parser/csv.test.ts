import { describe, it, expect } from "vitest";
import { parseCsv } from "@/lib/parser/csv";

const SAMPLE = `Date,Description,Amount
2026-04-01,STARBUCKS #1234,-4.50
2026-04-01,PAYROLL DEPOSIT,2500.00
04/03/2026,"NETFLIX.COM, LOS GATOS",-15.99
,EMPTY DATE,-1.00
`;

describe("parseCsv", () => {
  it("parses header-style CSV with ISO dates and negative expenses", () => {
    const txs = parseCsv(SAMPLE);
    expect(txs).toHaveLength(3);
    expect(txs[0].date).toBe("2026-04-01");
    expect(txs[0].merchant).toBe("STARBUCKS");
    expect(txs[0].amount).toBe(-4.5);
  });

  it("normalizes US-style dates to ISO", () => {
    const txs = parseCsv(SAMPLE);
    const netflix = txs.find((t) => t.rawDescription.includes("NETFLIX"))!;
    expect(netflix.date).toBe("2026-04-03");
  });

  it("strips noisy merchant suffixes like #1234 and city names", () => {
    const txs = parseCsv(SAMPLE);
    const netflix = txs.find((t) => t.rawDescription.includes("NETFLIX"))!;
    expect(netflix.merchant).toBe("NETFLIX.COM");
  });

  it("generates stable ids", () => {
    const a = parseCsv(SAMPLE);
    const b = parseCsv(SAMPLE);
    expect(a[0].id).toBe(b[0].id);
    expect(new Set(a.map((t) => t.id)).size).toBe(a.length);
  });

  it("skips rows with no date", () => {
    const txs = parseCsv(SAMPLE);
    expect(txs.find((t) => t.rawDescription.includes("EMPTY DATE"))).toBeUndefined();
  });
});
