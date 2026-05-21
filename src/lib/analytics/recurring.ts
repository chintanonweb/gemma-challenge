import type { Recurring, Transaction } from "@/lib/types";

const daysBetween = (a: string, b: string): number =>
  Math.round((+new Date(b) - +new Date(a)) / (1000 * 60 * 60 * 24));

export function findRecurring(txs: Transaction[]): Recurring[] {
  const byMerchant = new Map<string, Transaction[]>();
  for (const t of txs) {
    if (t.amount >= 0) continue;
    const key = t.merchant.toUpperCase();
    const arr = byMerchant.get(key);
    if (arr) arr.push(t);
    else byMerchant.set(key, [t]);
  }

  const out: Recurring[] = [];
  for (const [merchant, group] of byMerchant) {
    if (group.length < 3) continue;
    const sorted = [...group].sort((a, b) => a.date.localeCompare(b.date));
    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      gaps.push(daysBetween(sorted[i - 1].date, sorted[i].date));
    }
    const avgGap = gaps.reduce((s, g) => s + g, 0) / gaps.length;

    const isRecurring =
      (avgGap >= 6 && avgGap <= 8) ||
      (avgGap >= 13 && avgGap <= 16) ||
      (avgGap >= 28 && avgGap <= 32) ||
      (avgGap >= 85 && avgGap <= 95) ||
      (avgGap >= 360 && avgGap <= 370);
    if (!isRecurring) continue;

    const amounts = sorted.map((t) => Math.abs(t.amount));
    const typical = amounts.reduce((s, a) => s + a, 0) / amounts.length;
    // Snap to human-readable cadence: weekly=52, bi-weekly=26, monthly=12, quarterly=4, yearly=1
    let periodsPerYear: number;
    if (avgGap <= 8) periodsPerYear = 52;
    else if (avgGap <= 16) periodsPerYear = 26;
    else if (avgGap <= 32) periodsPerYear = 12;
    else if (avgGap <= 95) periodsPerYear = 4;
    else periodsPerYear = 1;
    out.push({
      merchant,
      amount: Number(typical.toFixed(2)),
      cadenceDays: Math.round(avgGap),
      occurrences: sorted.length,
      firstDate: sorted[0].date,
      lastDate: sorted[sorted.length - 1].date,
      annualTotal: Number((typical * periodsPerYear).toFixed(2)),
    });
  }
  return out.sort((a, b) => b.annualTotal - a.annualTotal);
}
