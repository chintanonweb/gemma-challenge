import type { Category, CategoryStat, Transaction } from "@/lib/types";

export function totalByCategory(txs: Transaction[]): CategoryStat[] {
  const map = new Map<Category, { total: number; count: number }>();
  for (const t of txs) {
    if (!t.category || t.category === "income" || t.amount >= 0) continue;
    const e = map.get(t.category) ?? { total: 0, count: 0 };
    e.total += t.amount;
    e.count += 1;
    map.set(t.category, e);
  }
  return [...map.entries()]
    .map(([category, v]) => ({ category, total: v.total, count: v.count }))
    .sort((a, b) => a.total - b.total);
}

export interface MoM {
  currentMonth: number;
  previousMonth: number;
  deltaPct: number;
}

export function monthOverMonth(txs: Transaction[]): MoM {
  const monthOf = (d: string) => d.slice(0, 7);
  const byMonth = new Map<string, number>();
  for (const t of txs) {
    if (t.amount >= 0) continue;
    const m = monthOf(t.date);
    byMonth.set(m, (byMonth.get(m) ?? 0) + t.amount);
  }
  const months = [...byMonth.keys()].sort();
  if (months.length < 2) return { currentMonth: 0, previousMonth: 0, deltaPct: 0 };
  const previousMonth = byMonth.get(months[months.length - 2])!;
  const currentMonth = byMonth.get(months[months.length - 1])!;
  // Compare absolute spend so growth in spending shows as a positive delta.
  const deltaPct =
    previousMonth === 0
      ? 0
      : ((Math.abs(currentMonth) - Math.abs(previousMonth)) / Math.abs(previousMonth)) * 100;
  return { currentMonth, previousMonth, deltaPct };
}

export interface HeadlineStats {
  totalSpend: number;
  totalIncome: number;
  net: number;
}

export function headlineStats(txs: Transaction[]): HeadlineStats {
  let totalSpend = 0;
  let totalIncome = 0;
  for (const t of txs) {
    if (t.amount < 0) totalSpend += t.amount;
    else totalIncome += t.amount;
  }
  return { totalSpend, totalIncome, net: totalSpend + totalIncome };
}
