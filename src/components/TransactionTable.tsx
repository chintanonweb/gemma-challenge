import type { Transaction, Category } from "@/lib/types";

const CATEGORY_COLOR: Record<Category, string> = {
  groceries: "bg-emerald-900/40 text-emerald-300 border-emerald-800/60",
  restaurants: "bg-amber-900/40 text-amber-300 border-amber-800/60",
  transport: "bg-sky-900/40 text-sky-300 border-sky-800/60",
  utilities: "bg-violet-900/40 text-violet-300 border-violet-800/60",
  subscriptions: "bg-fuchsia-900/40 text-fuchsia-300 border-fuchsia-800/60",
  shopping: "bg-pink-900/40 text-pink-300 border-pink-800/60",
  entertainment: "bg-rose-900/40 text-rose-300 border-rose-800/60",
  health: "bg-teal-900/40 text-teal-300 border-teal-800/60",
  travel: "bg-indigo-900/40 text-indigo-300 border-indigo-800/60",
  income: "bg-emerald-900/60 text-emerald-200 border-emerald-700",
  transfer: "bg-neutral-800 text-neutral-300 border-neutral-700",
  fees: "bg-red-900/40 text-red-300 border-red-800/60",
  other: "bg-neutral-800 text-neutral-400 border-neutral-700",
};

export function TransactionTable({ txs }: { txs: Transaction[] }) {
  return (
    <div className="rounded-xl border border-neutral-800 overflow-hidden">
      <div className="bg-neutral-900/60 px-4 py-3 flex items-baseline justify-between">
        <h2 className="text-sm font-medium text-neutral-200">Transactions</h2>
        <span className="text-xs text-neutral-500">{txs.length} entries</span>
      </div>
      <div className="max-h-[480px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-neutral-900/40 text-neutral-400 sticky top-0 backdrop-blur">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Date</th>
              <th className="text-left px-4 py-2 font-medium">Merchant</th>
              <th className="text-left px-4 py-2 font-medium">Category</th>
              <th className="text-right px-4 py-2 font-medium">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-900">
            {txs.map((t) => (
              <tr key={t.id} className="hover:bg-neutral-900/40 transition-colors">
                <td className="px-4 py-2 font-mono text-neutral-400 whitespace-nowrap">{t.date}</td>
                <td className="px-4 py-2 text-neutral-100">{t.merchant}</td>
                <td className="px-4 py-2">
                  {t.category ? (
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs border ${CATEGORY_COLOR[t.category]}`}
                    >
                      {t.category}
                    </span>
                  ) : (
                    <span className="inline-block h-4 w-16 rounded bg-neutral-800 animate-pulse" />
                  )}
                </td>
                <td
                  className={`px-4 py-2 text-right font-mono whitespace-nowrap ${
                    t.amount < 0 ? "text-red-400" : "text-emerald-400"
                  }`}
                >
                  {t.amount < 0 ? "-" : "+"}${Math.abs(t.amount).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
