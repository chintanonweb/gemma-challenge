"use client";

import {
  pipeline,
  TextStreamer,
  type ProgressInfo,
  type TextGenerationPipeline,
} from "@huggingface/transformers";

// User-selectable Gemma 4 variants. The E-series run fully on-device via WebGPU;
// the OpenRouter option calls Gemma 4 31B Dense in the cloud (free tier) — no download,
// but your prompt and any receipt photo are sent to OpenRouter's servers for inference.
export const MODELS = {
  e2b: {
    id: "onnx-community/gemma-4-E2B-it-ONNX",
    label: "Gemma 4 E2B",
    size: "~1.5 GB",
    tag: "Fast",
    provider: "local",
    privacy: "on-device",
    description: "Faster download, lighter reasoning. Best for first-time users.",
  },
  e4b: {
    id: "onnx-community/gemma-4-E4B-it-ONNX",
    label: "Gemma 4 E4B",
    size: "~2.5 GB",
    tag: "Smart",
    provider: "local",
    privacy: "on-device",
    description: "Larger download, better at multi-step questions and tricky merchant strings.",
  },
  cloud31b: {
    id: "google/gemma-4-31b-it:free",
    label: "Gemma 4 31B",
    size: "0 GB",
    tag: "Instant",
    provider: "openrouter",
    privacy: "sent to cloud",
    description:
      "No download. Highest quality. Your prompts and receipt photos are sent to OpenRouter's free tier — choose this only if you accept that trade-off.",
  },
} as const;

export type ModelKey = keyof typeof MODELS;
export type Provider = "local" | "openrouter";
const DEFAULT_KEY: ModelKey = "e2b";
const STORAGE_KEY = "pocketcfo:model";

export function getProvider(): Provider {
  return MODELS[getModelKey()].provider as Provider;
}

export function getModelKey(): ModelKey {
  if (typeof window === "undefined") return DEFAULT_KEY;
  const v = window.localStorage.getItem(STORAGE_KEY) as ModelKey | null;
  return v && v in MODELS ? v : DEFAULT_KEY;
}

export function setModelKey(key: ModelKey): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, key);
  // Invalidate cached pipeline so the next loadModel() picks up the new ID.
  pipePromise = null;
  lastProgress = null;
}

// Kept for compatibility with any external imports; reads the currently-selected variant.
export function getModelId(): string {
  return MODELS[getModelKey()].id;
}
export const MODEL_ID = MODELS[DEFAULT_KEY].id;

export interface ModelProgress {
  status: string;
  file?: string;
  progress?: number;
  loaded?: number;
  total?: number;
}

type Progress = (p: ModelProgress) => void;

let pipePromise: Promise<TextGenerationPipeline> | null = null;
const subscribers = new Set<Progress>();
let lastProgress: ModelProgress | null = null;
let lastBroadcastAt = 0;

const broadcast = (p: ModelProgress) => {
  // Throttle: at most 4 updates/sec, and always pass through status changes / file switches / 100%.
  const now = Date.now();
  const statusChanged = p.status !== lastProgress?.status;
  const fileChanged = p.file !== lastProgress?.file;
  const isDone = p.progress != null && p.progress >= 99.5;
  if (!statusChanged && !fileChanged && !isDone && now - lastBroadcastAt < 250) {
    // Still store the latest so subscribers attaching later see it.
    lastProgress = p;
    return;
  }
  lastBroadcastAt = now;
  lastProgress = p;
  for (const fn of subscribers) fn(p);
};

export function subscribeProgress(fn: Progress): () => void {
  subscribers.add(fn);
  if (lastProgress) fn(lastProgress);
  return () => {
    subscribers.delete(fn);
  };
}

export function loadModel(): Promise<TextGenerationPipeline> {
  // For cloud providers there's nothing to download — resolve immediately.
  if (getProvider() === "openrouter") {
    if (!pipePromise) {
      broadcast({ status: "ready" });
      pipePromise = Promise.resolve(null as unknown as TextGenerationPipeline);
    }
    return pipePromise;
  }
  if (pipePromise) return pipePromise;
  const opts = {
    device: "webgpu" as const,
    dtype: "q4f16" as const,
    progress_callback: (info: ProgressInfo) => {
      const p: ModelProgress = {
        status: info.status,
        file: "file" in info ? (info.file as string) : undefined,
        progress: "progress" in info ? (info.progress as number) : undefined,
        loaded: "loaded" in info ? (info.loaded as number) : undefined,
        total: "total" in info ? (info.total as number) : undefined,
      };
      broadcast(p);
    },
  };
  // Transformers.js's pipeline() has a union return type too complex for TS;
  // cast through unknown to keep our own narrow surface.
  type PipelineFn = (task: string, model: string, opts: object) => Promise<TextGenerationPipeline>;
  pipePromise = (pipeline as unknown as PipelineFn)("text-generation", getModelId(), opts);
  return pipePromise;
}

export async function generate(
  prompt: string,
  opts: { maxNewTokens?: number; temperature?: number } = {},
): Promise<string> {
  if (getProvider() === "openrouter") {
    const { generateOpenRouter } = await import("@/lib/engine/openrouter");
    return generateOpenRouter(prompt, opts);
  }
  const gen = await loadModel();
  const messages = [{ role: "user", content: prompt }];
  const res = await gen(messages, {
    max_new_tokens: opts.maxNewTokens ?? 128,
    temperature: opts.temperature ?? 0.2,
    do_sample: (opts.temperature ?? 0.2) > 0,
    return_full_text: false,
  });
  const out = Array.isArray(res) ? res[0] : res;
  const generated = (out as { generated_text: unknown }).generated_text;
  if (typeof generated === "string") return generated.trim();
  if (Array.isArray(generated) && generated.length > 0) {
    const last = generated[generated.length - 1] as unknown;
    if (typeof last === "string") return last.trim();
    if (last && typeof last === "object" && "content" in last) {
      const content = (last as { content: unknown }).content;
      if (typeof content === "string") return content.trim();
    }
  }
  return "";
}

export async function generateStream(
  prompt: string,
  onToken: (chunk: string) => void,
  opts: { maxNewTokens?: number; temperature?: number } = {},
): Promise<string> {
  if (getProvider() === "openrouter") {
    const { streamOpenRouter } = await import("@/lib/engine/openrouter");
    return streamOpenRouter(prompt, onToken, opts);
  }
  const gen = await loadModel();
  let full = "";
  const streamer = new TextStreamer(gen.tokenizer, {
    skip_prompt: true,
    skip_special_tokens: true,
    callback_function: (text: string) => {
      full += text;
      onToken(text);
    },
  });
  const messages = [{ role: "user", content: prompt }];
  await gen(messages, {
    max_new_tokens: opts.maxNewTokens ?? 256,
    temperature: opts.temperature ?? 0.2,
    do_sample: (opts.temperature ?? 0.2) > 0,
    return_full_text: false,
    streamer,
  } as Parameters<typeof gen>[1]);
  return full.trim();
}
