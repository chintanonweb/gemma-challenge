"use client";

import { generateStream } from "@/lib/engine/client";
import { headlineStats, totalByCategory } from "@/lib/analytics/totals";
import type { Transaction } from "@/lib/types";

function buildContext(txs: Transaction[]): string {
  const h = headlineStats(txs);
  const cats = totalByCategory(txs);
  const catLines = cats
    .map(
      (c) =>
        `- ${c.category}: $${Math.abs(c.total).toFixed(2)} across ${c.count} transactions`,
    )
    .join("\n");
  // Gemma 4's 128K context easily handles a year of transactions verbatim — no RAG needed.
  const txLines = txs
    .map(
      (t) =>
        `${t.date} | ${t.merchant} | ${t.category ?? "uncategorized"} | ${t.amount.toFixed(2)}`,
    )
    .join("\n");
  return `STATEMENT SUMMARY
Total spend: $${Math.abs(h.totalSpend).toFixed(2)}
Total income: $${h.totalIncome.toFixed(2)}
Net: $${h.net.toFixed(2)}

BY CATEGORY:
${catLines}

ALL TRANSACTIONS (date | merchant | category | amount):
${txLines}`;
}

export async function answerQuestion(
  question: string,
  txs: Transaction[],
  onToken: (chunk: string) => void,
): Promise<string> {
  const ctx = buildContext(txs);
  const prompt = `You are a helpful personal-finance assistant analyzing one user's bank statement.

${ctx}

Answer the user's question using only the data above. Be concise (1-3 sentences). When useful, name the specific transactions. If the data doesn't answer the question, say so.

Question: ${question}
Answer:`;
  return generateStream(prompt, onToken, { maxNewTokens: 220, temperature: 0.2 });
}
