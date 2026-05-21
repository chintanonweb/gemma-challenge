"use client";

import { useCallback, useState } from "react";
import { parseCsv } from "@/lib/parser/csv";
import type { Transaction } from "@/lib/types";

interface Props {
  onParsed: (txs: Transaction[]) => void;
}

export function DropZone({ onParsed }: Props) {
  const [hover, setHover] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setErr(null);
      try {
        const text = await file.text();
        const txs = parseCsv(text);
        if (!txs.length) throw new Error("Couldn't find any transactions in that file.");
        onParsed(txs);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to parse file");
      }
    },
    [onParsed],
  );

  const trySample = useCallback(async () => {
    try {
      const res = await fetch("/sample-statement.csv");
      if (!res.ok) throw new Error(`Couldn't load sample (${res.status})`);
      const text = await res.text();
      onParsed(parseCsv(text));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load sample");
    }
  }, [onParsed]);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setHover(true);
      }}
      onDragLeave={() => setHover(false)}
      onDrop={(e) => {
        e.preventDefault();
        setHover(false);
        const f = e.dataTransfer.files[0];
        if (f) handleFile(f);
      }}
      className={`rounded-2xl border-2 border-dashed p-12 text-center transition-all ${
        hover
          ? "border-emerald-400 bg-emerald-950/20 scale-[1.01]"
          : "border-neutral-700 bg-neutral-900/40"
      }`}
    >
      <div className="text-4xl mb-3">📂</div>
      <p className="text-lg text-neutral-200 font-medium">Drop a bank statement CSV</p>
      <p className="text-sm text-neutral-500 mt-1">It never leaves this tab.</p>
      <div className="mt-5 flex justify-center gap-3 flex-wrap">
        <label className="inline-block rounded-md bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2 text-sm font-medium cursor-pointer transition-colors">
          Choose file
          <input
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </label>
        <button
          onClick={trySample}
          className="rounded-md border border-neutral-700 hover:border-neutral-500 text-neutral-200 px-4 py-2 text-sm transition-colors"
        >
          Try a sample statement
        </button>
      </div>
      {err && <p className="mt-3 text-sm text-red-400">{err}</p>}
    </div>
  );
}
