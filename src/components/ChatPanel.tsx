"use client";

import { useState } from "react";
import { answerQuestion } from "@/lib/engine/qa";
import type { Transaction } from "@/lib/types";

interface Msg {
  role: "user" | "assistant";
  text: string;
}

const EXAMPLES = [
  "How much did I spend on coffee?",
  "Which subscription costs me the most per year?",
  "What was my single largest expense?",
  "How much did I spend on restaurants vs groceries?",
];

export function ChatPanel({ txs, disabled }: { txs: Transaction[]; disabled: boolean }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [q, setQ] = useState("");
  const [thinking, setThinking] = useState(false);

  const ask = async (text: string) => {
    if (!text.trim() || thinking || disabled) return;
    setMsgs((m) => [...m, { role: "user", text }, { role: "assistant", text: "" }]);
    setQ("");
    setThinking(true);
    try {
      await answerQuestion(text, txs, (chunk) => {
        setMsgs((m) => {
          const next = [...m];
          const last = next[next.length - 1];
          next[next.length - 1] = { ...last, text: last.text + chunk };
          return next;
        });
      });
    } catch (e) {
      setMsgs((m) => {
        const next = [...m];
        next[next.length - 1] = {
          role: "assistant",
          text: `Error: ${e instanceof Error ? e.message : String(e)}`,
        };
        return next;
      });
    } finally {
      setThinking(false);
    }
  };

  return (
    <div className="rounded-xl border border-neutral-800 p-5 bg-neutral-900/30">
      <h2 className="text-lg font-semibold">Ask anything about your money</h2>
      <p className="text-xs text-neutral-500 mt-1">
        Runs locally with Gemma 4. Your question never leaves the tab.
      </p>

      {msgs.length === 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {EXAMPLES.map((e) => (
            <button
              key={e}
              onClick={() => ask(e)}
              disabled={disabled || thinking}
              className="text-xs rounded-full border border-neutral-700 hover:border-emerald-500 hover:text-emerald-300 px-3 py-1 text-neutral-300 disabled:opacity-40 disabled:hover:border-neutral-700 disabled:hover:text-neutral-300 transition-colors"
            >
              {e}
            </button>
          ))}
        </div>
      )}

      {msgs.length > 0 && (
        <div className="mt-4 space-y-3 max-h-96 overflow-y-auto pr-1">
          {msgs.map((m, i) => (
            <div
              key={i}
              className={`rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-neutral-800 text-neutral-100 ml-12"
                  : "bg-emerald-950/30 text-emerald-50 mr-12 border border-emerald-900/40"
              }`}
            >
              {m.text || (thinking ? "…" : "")}
            </div>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(q);
        }}
        className="mt-4 flex gap-2"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          disabled={disabled || thinking}
          placeholder={disabled ? "Waiting for AI…" : "Ask a question about your money…"}
          className="flex-1 rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled || thinking || !q.trim()}
          className="rounded-md bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2 text-sm font-medium disabled:opacity-40 transition-colors"
        >
          Ask
        </button>
      </form>
    </div>
  );
}
