"use client";

import { generate } from "@/lib/engine/client";
import { headlineStats, monthOverMonth, totalByCategory } from "@/lib/analytics/totals";
import { findRecurring } from "@/lib/analytics/recurring";
import type { Transaction } from "@/lib/types";

export interface Insight {
  emoji: string;
  text: string;
}

function buildBriefing(txs: Transaction[]): string {
  const h = headlineStats(txs);
  const mom = monthOverMonth(txs);
  const cats = totalByCategory(txs).slice(0, 5);
  const recurring = findRecurring(txs).slice(0, 8);

  const catLines = cats
    .map((c) => `- ${c.category}: $${Math.abs(c.total).toFixed(2)} (${c.count} txns)`)
    .join("\n");
  const recLines = recurring
    .map((r) => `- ${r.merchant}: $${r.amount.toFixed(2)} every ~${r.cadenceDays} days → $${r.annualTotal.toFixed(0)}/yr`)
    .join("\n");

  return `Financial snapshot for one user:
Total spend: $${Math.abs(h.totalSpend).toFixed(2)}
Total income: $${h.totalIncome.toFixed(2)}
Net: $${h.net.toFixed(2)}
Month-over-month spend change: ${mom.deltaPct.toFixed(1)}%

Top categories:
${catLines}

Recurring charges:
${recLines}`;
}

export async function generateInsights(txs: Transaction[]): Promise<Insight[]> {
  // Refuse to advise on too-little data.
  if (txs.filter((t) => t.category).length < 5) return [];

  const briefing = buildBriefing(txs);
  const prompt = `You are a sharp personal-finance assistant looking at one person's statement. Read the data below and output exactly 3 short, specific, actionable observations. Each observation:
- starts with one relevant emoji
- is 1 short sentence (≤ 18 words)
- references actual numbers from the data
- focuses on a concrete action or notable pattern
- avoids generic advice like "track your spending"

DATA:
${briefing}

Output format (exactly 3 lines, no numbering, no extra text):
<emoji> <observation 1>
<emoji> <observation 2>
<emoji> <observation 3>`;

  const raw = await generate(prompt, { maxNewTokens: 220, temperature: 0.3 });
  return parseInsights(raw);
}

export function parseInsights(raw: string): Insight[] {
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !/^\s*(observation|note|here|output|format)/i.test(l))
    .slice(0, 3);

  return lines
    .map((line) => {
      // Strip leading list markers / numbering.
      const cleaned = line.replace(/^[-*•\d.)\s]+/, "").trim();
      // Pull the leading emoji (first grapheme that's not a letter/number).
      const match = cleaned.match(/^(\S+)\s+(.+)$/);
      if (!match) return { emoji: "💡", text: cleaned };
      const first = match[1];
      const rest = match[2];
      const looksLikeEmoji = !/^[A-Za-z0-9]/.test(first);
      return looksLikeEmoji
        ? { emoji: first, text: rest }
        : { emoji: "💡", text: cleaned };
    })
    .filter((i) => i.text.length > 0);
}
