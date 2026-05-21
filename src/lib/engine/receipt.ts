"use client";

import { pipeline, type ProgressInfo } from "@huggingface/transformers";
import { getModelId, getProvider, type ModelProgress } from "@/lib/engine/client";
import { extractReceiptOpenRouter } from "@/lib/engine/openrouter";
import type { Transaction } from "@/lib/types";

// Separate pipeline for vision; Transformers.js dedupes model weight downloads by ID.
type VisionPipeline = (
  input: { messages?: unknown[]; images?: unknown[] } | unknown,
  opts?: Record<string, unknown>,
) => Promise<unknown>;

let visionPipePromise: Promise<VisionPipeline> | null = null;

export function loadVision(onProgress?: (p: ModelProgress) => void): Promise<VisionPipeline> {
  if (visionPipePromise) return visionPipePromise;
  const opts = {
    device: "webgpu" as const,
    dtype: "q4f16" as const,
    progress_callback: (info: ProgressInfo) => {
      if (!onProgress) return;
      onProgress({
        status: info.status,
        file: "file" in info ? (info.file as string) : undefined,
        progress: "progress" in info ? (info.progress as number) : undefined,
        loaded: "loaded" in info ? (info.loaded as number) : undefined,
        total: "total" in info ? (info.total as number) : undefined,
      });
    },
  };
  type PipelineFn = (task: string, model: string, opts: object) => Promise<VisionPipeline>;
  visionPipePromise = (pipeline as unknown as PipelineFn)(
    "image-text-to-text",
    getModelId(),
    opts,
  );
  return visionPipePromise;
}

export function invalidateVisionPipe(): void {
  visionPipePromise = null;
}

const PROMPT = `Look at this receipt photo. Extract three things and reply in this exact format with no extra text:
MERCHANT: <store or restaurant name>
AMOUNT: <total amount as a decimal number, e.g. 24.95>
DATE: <date as YYYY-MM-DD, or today if not visible>`;

export interface ExtractedReceipt {
  merchant: string;
  amount: number;
  date: string;
  rawOutput: string;
}

const todayISO = (): string => new Date().toISOString().slice(0, 10);

function parseReceiptText(text: string): ExtractedReceipt {
  const merchant = text.match(/MERCHANT:\s*(.+)/i)?.[1]?.trim() ?? "Unknown merchant";
  const amount = Number(
    text
      .match(/AMOUNT:\s*\$?([\d.,]+)/i)?.[1]
      ?.replace(/,/g, "") ?? 0,
  );
  const date = text.match(/DATE:\s*(\d{4}-\d{2}-\d{2})/)?.[1] ?? todayISO();
  return {
    merchant: merchant.slice(0, 60),
    amount: Number.isFinite(amount) ? amount : 0,
    date,
    rawOutput: text,
  };
}

async function extractLocal(imageUrl: string): Promise<ExtractedReceipt> {
  const pipe = await loadVision();
  const messages = [
    {
      role: "user",
      content: [
        { type: "image", image: imageUrl },
        { type: "text", text: PROMPT },
      ],
    },
  ];
  const result = await pipe({ messages } as unknown, {
    max_new_tokens: 80,
    do_sample: false,
  });
  const out = Array.isArray(result) ? result[0] : (result as unknown);
  const generated =
    (out as { generated_text?: unknown }).generated_text ??
    (out as { output?: unknown }).output ??
    "";
  let text = "";
  if (typeof generated === "string") text = generated;
  else if (Array.isArray(generated) && generated.length > 0) {
    const last = generated[generated.length - 1] as unknown;
    if (typeof last === "string") text = last;
    else if (last && typeof last === "object" && "content" in last) {
      const c = (last as { content: unknown }).content;
      if (typeof c === "string") text = c;
      else if (Array.isArray(c)) {
        const tnode = c.find(
          (n) =>
            typeof n === "object" &&
            n !== null &&
            "type" in n &&
            (n as { type: string }).type === "text",
        ) as { text?: string } | undefined;
        if (tnode?.text) text = tnode.text;
      }
    }
  }
  return parseReceiptText(text);
}

async function extractCloud(imageUrl: string): Promise<ExtractedReceipt> {
  const blob = await (await fetch(imageUrl)).blob();
  const text = await extractReceiptOpenRouter(blob, PROMPT);
  return parseReceiptText(text);
}

export async function extractFromReceipt(imageUrl: string): Promise<ExtractedReceipt> {
  return getProvider() === "openrouter" ? extractCloud(imageUrl) : extractLocal(imageUrl);
}

const hash = (s: string): string => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
};

export function toTransaction(extracted: ExtractedReceipt): Transaction {
  const amount = -Math.abs(extracted.amount);
  return {
    id: `r-${hash(`${extracted.date}|${extracted.merchant}|${amount}|${Date.now()}`)}`,
    date: extracted.date,
    merchant: extracted.merchant,
    rawDescription: `Receipt: ${extracted.merchant}`,
    amount,
    source: "receipt",
  };
}
