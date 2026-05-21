"use client";

import { generate, getProvider } from "@/lib/engine/client";
import type { Category, Transaction } from "@/lib/types";

const CATEGORIES: readonly Category[] = [
  "groceries",
  "restaurants",
  "transport",
  "utilities",
  "subscriptions",
  "shopping",
  "entertainment",
  "health",
  "travel",
  "income",
  "transfer",
  "fees",
  "other",
] as const;

const SYSTEM = `You classify bank transactions into one of these categories: ${CATEGORIES.join(", ")}.
Reply with only the single category word that best fits, lowercase, no punctuation, no explanation.`;

function pickCategory(raw: string): Category {
  const cleaned = raw.toLowerCase().replace(/[^a-z]/g, " ").trim();
  for (const c of CATEGORIES) {
    if (cleaned === c) return c;
  }
  for (const c of CATEGORIES) {
    if (cleaned.includes(c)) return c;
  }
  return "other";
}

export async function categorizeOne(tx: Transaction): Promise<Category> {
  const prompt = `${SYSTEM}

Transaction: "${tx.rawDescription}" amount ${tx.amount.toFixed(2)}
Category:`;
  const raw = await generate(prompt, { maxNewTokens: 6, temperature: 0 });
  return pickCategory(raw);
}

/** Batched categorization — sends a chunk of transactions in one prompt.
 * Used for cloud mode (rate-limited) and large local statements. */
async function categorizeBatch(chunk: Transaction[]): Promise<Category[]> {
  const numbered = chunk
    .map((t, i) => `${i + 1}. ${t.rawDescription} (${t.amount.toFixed(2)})`)
    .join("\n");
  const prompt = `You are classifying bank transactions. Categories: ${CATEGORIES.join(", ")}.

For each numbered transaction below, output ONE LINE in the form: "<number>. <category>". Use only categories from the list. Output ALL ${chunk.length} lines in order, nothing else.

Transactions:
${numbered}

Classifications:`;
  const raw = await generate(prompt, {
    maxNewTokens: Math.max(120, chunk.length * 8),
    temperature: 0,
  });

  // Parse "N. category" lines.
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  const out: Category[] = new Array(chunk.length).fill("other");
  for (const line of lines) {
    const m = line.match(/^(\d+)[.):\-]?\s*(.+)$/);
    if (!m) continue;
    const idx = Number(m[1]) - 1;
    if (idx < 0 || idx >= chunk.length) continue;
    out[idx] = pickCategory(m[2]);
  }
  return out;
}

export async function categorizeAll(
  txs: Transaction[],
  onUpdate: (idx: number, cat: Category) => void,
  signal?: AbortSignal,
): Promise<void> {
  // Cloud mode hits 16 req/min on the free tier; batched is mandatory.
  // Local mode also benefits from batching for large statements, but per-tx
  // gives nicer "pills light up one by one" demo UX for small statements.
  const useBatch = getProvider() === "openrouter" || txs.length > 30;

  if (!useBatch) {
    for (let i = 0; i < txs.length; i++) {
      if (signal?.aborted) return;
      if (txs[i].category) continue;
      try {
        const cat = await categorizeOne(txs[i]);
        if (signal?.aborted) return;
        onUpdate(i, cat);
      } catch {
        onUpdate(i, "other");
      }
    }
    return;
  }

  // Batched path: chunks of up to 25 to keep prompts tight + give visible progress.
  const CHUNK = 25;
  const pending: Array<{ idx: number; tx: Transaction }> = txs
    .map((tx, idx) => ({ idx, tx }))
    .filter((p) => !p.tx.category);
  for (let i = 0; i < pending.length; i += CHUNK) {
    if (signal?.aborted) return;
    const slice = pending.slice(i, i + CHUNK);
    try {
      const cats = await categorizeBatch(slice.map((p) => p.tx));
      if (signal?.aborted) return;
      slice.forEach((p, j) => onUpdate(p.idx, cats[j] ?? "other"));
    } catch {
      slice.forEach((p) => onUpdate(p.idx, "other"));
    }
  }
}
