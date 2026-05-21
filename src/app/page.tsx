"use client";

import { useEffect, useMemo, useState } from "react";
import { ChatPanel } from "@/components/ChatPanel";
import { DropZone } from "@/components/DropZone";
import { InsightsPanel } from "@/components/InsightsPanel";
import { ModelLoadProgress } from "@/components/ModelLoadProgress";
import { ModelPicker } from "@/components/ModelPicker";
import { ReceiptCapture } from "@/components/ReceiptCapture";
import { RecurringPanel } from "@/components/RecurringPanel";
import { StatsCards } from "@/components/StatsCards";
import { TransactionTable } from "@/components/TransactionTable";
import { useModel } from "@/hooks/useModel";
import { useStatement } from "@/hooks/useStatement";
import { findRecurring } from "@/lib/analytics/recurring";
import { categorizeAll } from "@/lib/engine/categorize";

export default function Home() {
  const { txs, setTxs, forget, hydrated } = useStatement();
  const { ready, progress, error, provider } = useModel(txs.length > 0);
  const [categorizing, setCategorizing] = useState(false);

  useEffect(() => {
    if (!ready || txs.length === 0) return;
    if (txs.every((t) => t.category)) return;
    const ctrl = new AbortController();
    setCategorizing(true);
    categorizeAll(
      txs,
      (idx, cat) => {
        setTxs((prev) => prev.map((t, i) => (i === idx ? { ...t, category: cat } : t)));
      },
      ctrl.signal,
    ).finally(() => setCategorizing(false));
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, txs.length]);

  // Memoize derived data so it doesn't recompute on every model-load-progress tick.
  const remaining = useMemo(() => txs.filter((t) => !t.category).length, [txs]);
  const recurring = useMemo(() => findRecurring(txs), [txs]);

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-10">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <div className="flex items-baseline gap-3">
            <h1 className="text-5xl font-semibold tracking-tight">PocketCFO</h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-300 border border-emerald-800">
              on-device · Gemma 4
            </span>
          </div>
          {txs.length > 0 && (
            <button
              onClick={forget}
              className="text-xs text-neutral-500 hover:text-red-400 underline transition-colors"
            >
              Forget everything
            </button>
          )}
        </div>
        <p className="mt-3 text-lg text-neutral-400 max-w-2xl">
          Your bank data never leaves this tab. Drop a statement, get a private finance brain —
          categorization, recurring-charge detection, and natural-language answers, all in your
          browser.
        </p>
      </section>
      <section className="max-w-5xl mx-auto px-6 pb-24 space-y-6">
        {!hydrated ? null : txs.length === 0 ? (
          <>
            <ModelPicker />
            <DropZone onParsed={setTxs} />
          </>
        ) : (
          <>
            {!ready && provider === "local" && (
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-6">
                <div className="flex items-baseline justify-between mb-3">
                  <h2 className="text-sm font-medium text-neutral-200">
                    Loading Gemma 4 into your browser
                  </h2>
                  <span className="text-xs text-neutral-500">
                    Parsed {txs.length} transactions
                  </span>
                </div>
                <ModelLoadProgress progress={progress} error={error} />
              </div>
            )}
            {ready && provider === "openrouter" && (
              <div className="rounded-xl border border-amber-900/40 bg-amber-950/10 px-4 py-2 text-xs text-amber-200">
                Cloud mode active — prompts and receipt photos are sent to OpenRouter for
                inference. Switch to E2B / E4B in the picker for fully on-device.
              </div>
            )}
            {ready && categorizing && remaining > 0 && (
              <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/10 px-4 py-2 text-xs text-emerald-300">
                Categorizing transactions… {txs.length - remaining}/{txs.length}
              </div>
            )}
            <StatsCards txs={txs} />
            <InsightsPanel txs={txs} ready={ready} />
            {recurring.length > 0 && <RecurringPanel items={recurring} />}
            <ReceiptCapture
              disabled={!ready}
              onAdd={(tx) => setTxs((prev) => [tx, ...prev])}
            />
            <ChatPanel txs={txs} disabled={!ready} />
            <TransactionTable txs={txs} />
          </>
        )}
      </section>
      <footer className="border-t border-neutral-900 py-6 mt-12">
        <div className="max-w-5xl mx-auto px-6 text-xs text-neutral-600 flex flex-wrap justify-between gap-2">
          <span>
            Built with Gemma 4 for the Google Gemma 4 Challenge. No analytics, no servers, no
            upload.
          </span>
          <a
            href="https://github.com/"
            className="hover:text-neutral-400 transition-colors"
          >
            View source
          </a>
        </div>
      </footer>
    </main>
  );
}
