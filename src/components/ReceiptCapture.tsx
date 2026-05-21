"use client";

import { useState } from "react";
import { extractFromReceipt, toTransaction, type ExtractedReceipt } from "@/lib/engine/receipt";
import type { Transaction } from "@/lib/types";

export function ReceiptCapture({
  onAdd,
  disabled,
}: {
  onAdd: (tx: Transaction) => void;
  disabled: boolean;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedReceipt | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setExtracted(null);
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setExtracting(true);
    try {
      const result = await extractFromReceipt(url);
      setExtracted(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't read the receipt");
    } finally {
      setExtracting(false);
    }
  };

  const reset = () => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(null);
    setExtracted(null);
    setError(null);
  };

  const confirm = () => {
    if (!extracted) return;
    onAdd(toTransaction(extracted));
    reset();
  };

  return (
    <div className="rounded-xl border border-amber-900/40 bg-amber-950/10 p-5">
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="text-lg font-semibold text-amber-100">Snap a receipt</h2>
          <p className="text-xs text-amber-300/70 mt-1">
            Gemma 4&apos;s vision encoder reads paper receipts on-device. Nothing is uploaded.
          </p>
        </div>
        {imageUrl && (
          <button
            onClick={reset}
            className="text-xs text-neutral-500 hover:text-neutral-300 underline"
          >
            Reset
          </button>
        )}
      </div>

      {!imageUrl ? (
        <div className="mt-4 flex flex-wrap gap-3">
          <label
            className={`inline-block rounded-md bg-amber-500 hover:bg-amber-400 text-black px-4 py-2 text-sm font-medium transition-colors ${
              disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
            }`}
          >
            Choose image
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={disabled}
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </label>
          <label
            className={`inline-block rounded-md border border-amber-700 hover:border-amber-500 text-amber-200 px-4 py-2 text-sm transition-colors ${
              disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
            }`}
          >
            Use camera
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              disabled={disabled}
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </label>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="Receipt"
            className="rounded-lg border border-neutral-800 max-h-80 object-contain bg-black"
          />
          <div className="space-y-3">
            {extracting && (
              <div className="text-sm text-amber-300">Gemma 4 is reading the receipt…</div>
            )}
            {error && <div className="text-sm text-red-400">{error}</div>}
            {extracted && (
              <>
                <div className="space-y-2 text-sm">
                  <Field
                    label="Merchant"
                    value={extracted.merchant}
                    onChange={(v) =>
                      setExtracted((p) => (p ? { ...p, merchant: v } : p))
                    }
                  />
                  <Field
                    label="Amount"
                    value={extracted.amount.toString()}
                    onChange={(v) =>
                      setExtracted((p) => (p ? { ...p, amount: Number(v) || 0 } : p))
                    }
                  />
                  <Field
                    label="Date"
                    value={extracted.date}
                    onChange={(v) => setExtracted((p) => (p ? { ...p, date: v } : p))}
                  />
                </div>
                <button
                  onClick={confirm}
                  className="w-full rounded-md bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2 text-sm font-medium transition-colors"
                >
                  Add to statement
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs text-neutral-500">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md bg-neutral-900 border border-neutral-700 px-3 py-1.5 text-sm text-neutral-100 focus:outline-none focus:border-amber-500"
      />
    </label>
  );
}
