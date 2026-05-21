"use client";

import { useEffect, useState } from "react";
import { getModelKey, MODELS, setModelKey, type ModelKey } from "@/lib/engine/client";
import { invalidateVisionPipe } from "@/lib/engine/receipt";

interface Props {
  onChange?: (key: ModelKey) => void;
  locked?: boolean;
}

export function ModelPicker({ onChange, locked }: Props) {
  const [selected, setSelected] = useState<ModelKey>("e2b");

  useEffect(() => {
    setSelected(getModelKey());
  }, []);

  const pick = (key: ModelKey) => {
    if (locked) return;
    setSelected(key);
    setModelKey(key);
    invalidateVisionPipe();
    onChange?.(key);
  };

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/30 p-5">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-sm font-medium text-neutral-200">Choose your model</h2>
        <span className="text-xs text-neutral-500">
          Both run fully on-device.{" "}
          <a
            href="https://huggingface.co/onnx-community/gemma-4-E2B-it-ONNX"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-neutral-300"
          >
            ONNX weights
          </a>
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {(Object.keys(MODELS) as ModelKey[]).map((key) => {
          const m = MODELS[key];
          const isActive = selected === key;
          const isCloud = m.provider === "openrouter";
          const activeBorder = isCloud ? "border-amber-500 bg-amber-950/20" : "border-emerald-500 bg-emerald-950/20";
          return (
            <button
              key={key}
              onClick={() => pick(key)}
              disabled={locked && !isActive}
              className={`text-left rounded-lg border p-4 transition-all ${
                isActive
                  ? activeBorder
                  : "border-neutral-800 hover:border-neutral-600 bg-neutral-900/40"
              } ${locked && !isActive ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium text-neutral-100">{m.label}</span>
                <span
                  className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded ${
                    isActive
                      ? isCloud
                        ? "bg-amber-900/60 text-amber-200"
                        : "bg-emerald-900/60 text-emerald-200"
                      : "bg-neutral-800 text-neutral-400"
                  }`}
                >
                  {m.tag}
                </span>
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xs text-neutral-500 font-mono">{m.size}</span>
                <span
                  className={`text-[10px] ${
                    isCloud ? "text-amber-300" : "text-emerald-300"
                  }`}
                >
                  {m.privacy}
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-2 leading-relaxed">{m.description}</p>
            </button>
          );
        })}
      </div>
      {locked && (
        <p className="text-[11px] text-neutral-500 mt-3">
          Model is locked while a download is in progress. To switch, click &quot;Forget
          everything&quot; in the header.
        </p>
      )}
    </div>
  );
}
