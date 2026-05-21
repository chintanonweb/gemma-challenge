import type { Recurring } from "@/lib/types";

const cadenceLabel = (days: number): string => {
  if (days <= 8) return "Weekly";
  if (days <= 16) return "Bi-weekly";
  if (days <= 32) return "Monthly";
  if (days <= 95) return "Quarterly";
  return "Yearly";
};

export function RecurringPanel({ items }: { items: Recurring[] }) {
  if (!items.length) return null;
  const total = items.reduce((s, r) => s + r.annualTotal, 0);
  return (
    <div className="rounded-xl border border-fuchsia-900/40 bg-fuchsia-950/10 p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold text-fuchsia-100">Recurring charges</h2>
        <span className="text-sm text-fuchsia-300 font-mono">
          ${total.toFixed(0)}/yr total
        </span>
      </div>
      <p className="text-xs text-fuchsia-300/70 mt-1">
        {items.length} {items.length === 1 ? "subscription" : "subscriptions"} you're paying for —
        forgotten ones add up.
      </p>
      <ul className="mt-4 divide-y divide-fuchsia-900/30">
        {items.map((r) => (
          <li
            key={r.merchant}
            className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0 text-sm"
          >
            <div>
              <div className="font-medium text-neutral-100">{r.merchant}</div>
              <div className="text-xs text-neutral-500">
                {cadenceLabel(r.cadenceDays)} · {r.occurrences} times since {r.firstDate}
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-neutral-100">${r.amount.toFixed(2)}</div>
              <div className="text-xs text-fuchsia-300">${r.annualTotal.toFixed(0)}/yr</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
