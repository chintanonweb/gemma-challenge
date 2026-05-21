"use client";

import { useEffect, useRef, useState } from "react";
import { generateInsights, type Insight } from "@/lib/engine/insights";
import type { Transaction } from "@/lib/types";

export function InsightsPanel({
  txs,
  ready,
}: {
  txs: Transaction[];
  ready: boolean;
}) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const lastRunRef = useRef<string | null>(null);

  const categorizedCount = txs.filter((t) => t.category).length;
  const allCategorized = txs.length > 0 && categorizedCount === txs.length;

  useEffect(() => {
    if (!ready || !allCategorized) return;
    const signature = `${txs.length}:${categorizedCount}`;
    if (lastRunRef.current === signature) return;
    lastRunRef.current = signature;
    setLoading(true);
    setErr(null);
    generateInsights(txs)
      .then((res) => setInsights(res))
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [ready, allCategorized, categorizedCount, txs]);

  const regenerate = () => {
    lastRunRef.current = null;
    setInsights([]);
    setErr(null);
    setLoading(true);
    generateInsights(txs)
      .then((res) => setInsights(res))
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  };

  if (!ready) return null;
  if (!allCategorized && !insights.length && !loading) {
    return (
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/30 p-5 text-sm text-neutral-500">
        AI insights will appear once categorization finishes ({categorizedCount}/{txs.length}).
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-sky-900/40 bg-gradient-to-br from-sky-950/30 to-indigo-950/20 p-5">
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="text-lg font-semibold text-sky-100">AI insights</h2>
          <p className="text-xs text-sky-300/70 mt-1">
            Specific observations Gemma 4 surfaced from your statement.
          </p>
        </div>
        {!loading && insights.length > 0 && (
          <button
            onClick={regenerate}
            className="text-xs text-sky-300 hover:text-sky-200 underline"
          >
            Regenerate
          </button>
        )}
      </div>
      {loading && insights.length === 0 && (
        <div className="mt-4 space-y-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-4 bg-sky-900/30 rounded animate-pulse"
              style={{ width: `${80 - i * 10}%` }}
            />
          ))}
        </div>
      )}
      {err && <div className="mt-4 text-sm text-red-400">{err}</div>}
      {insights.length > 0 && (
        <ul className="mt-4 space-y-2.5">
          {insights.map((ins, i) => (
            <li
              key={i}
              className="flex items-start gap-3 text-sm text-sky-50 leading-relaxed"
            >
              <span className="text-lg leading-none mt-0.5" aria-hidden>
                {ins.emoji}
              </span>
              <span>{ins.text}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
