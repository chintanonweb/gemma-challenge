import type { Transaction } from "@/lib/types";
import { headlineStats, monthOverMonth, totalByCategory } from "@/lib/analytics/totals";

const usd = (n: number): string => `${n < 0 ? "-" : ""}$${Math.abs(n).toFixed(0)}`;

export function StatsCards({ txs }: { txs: Transaction[] }) {
  const h = headlineStats(txs);
  const mom = monthOverMonth(txs);
  const byCat = totalByCategory(txs);
  const top3 = byCat.slice(0, 3);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card label="Total spend" value={usd(h.totalSpend)} accent="text-red-300" />
      <Card label="Total income" value={usd(h.totalIncome)} accent="text-emerald-300" />
      <Card
        label="Net"
        value={usd(h.net)}
        accent={h.net >= 0 ? "text-emerald-300" : "text-red-300"}
      />

      {top3.length > 0 && (
        <div className="md:col-span-3 rounded-xl border border-neutral-800 p-5">
          <div className="text-sm text-neutral-400 mb-4">Top categories</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {top3.map((c) => (
              <div key={c.category}>
                <div className="capitalize text-neutral-300">{c.category}</div>
                <div className="text-2xl font-mono text-red-300 mt-1">{usd(c.total)}</div>
                <div className="text-xs text-neutral-500 mt-0.5">
                  {c.count} {c.count === 1 ? "transaction" : "transactions"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {mom.previousMonth !== 0 && (
        <div className="md:col-span-3 rounded-xl border border-neutral-800 p-5">
          <div className="text-sm text-neutral-400">Month-over-month spend</div>
          <div className="mt-2 flex items-baseline gap-4">
            <span className="text-2xl font-mono text-red-300">{usd(mom.currentMonth)}</span>
            <span
              className={`text-sm ${
                mom.deltaPct > 0 ? "text-red-400" : "text-emerald-400"
              }`}
            >
              {mom.deltaPct > 0 ? "▲" : "▼"} {Math.abs(mom.deltaPct).toFixed(1)}% vs prior month
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-xl border border-neutral-800 p-5 bg-neutral-900/30">
      <div className="text-sm text-neutral-400">{label}</div>
      <div className={`mt-2 text-2xl font-mono ${accent}`}>{value}</div>
    </div>
  );
}
