# PocketCFO

> Your bank data never leaves this tab.

Drop a bank statement, snap a paper receipt, or just type a question — and get a private finance brain that runs entirely in your browser. Categorization, recurring-charge detection, and natural-language Q&A, all powered by **Gemma 4 E2B** on WebGPU.

**Live demo:** _(deploy URL after Vercel push)_
**Demo video:** _(Loom URL after recording)_

Built for the [Google Gemma 4 Challenge](https://dev.to/challenges/google-gemma-2026-05-06).

---

## Why on-device?

Your bank statement is the most personal data you own. You shouldn't have to upload it anywhere to get useful insights from it. Gemma 4 E2B is the first small model that's:

- **Multimodal** — reads transaction text *and* paper-receipt photos through the same weights.
- **Long-context** — a year of bank transactions fits in one prompt (128K context) — no RAG hacks.
- **Small enough for the browser** — ~1.5GB quantized, runs on WebGPU.

PocketCFO is the proof.

## What it does

- **Pick your model** — three options with a clear privacy/quality trade-off:
  - **Gemma 4 E2B** (~1.5 GB, on-device, fast) — default.
  - **Gemma 4 E4B** (~2.5 GB, on-device, smarter).
  - **Gemma 4 31B** (zero download, via OpenRouter — your data is sent to the cloud).
- **Drop a CSV** bank statement → transactions are parsed, deduped, and categorized by Gemma 4.
- **Snap a paper receipt** → Gemma 4's vision encoder extracts merchant, amount, and date and adds it as a transaction. Edit before saving.
- **AI Insights** — three specific, actionable observations Gemma 4 surfaces from your data ("Your coffee spending grew X%", "Cancelling Y would save $Z/yr").
- **Recurring-charge panel** surfaces every subscription you're paying for, with annual-cost totals.
- **Stats cards** show headline spend, income, net, top categories, month-over-month change.
- **Ask anything** in natural language — *"how much did I spend on coffee?", "which subscription costs me the most per year?"* — answers stream from the same model.
- **IndexedDB persistence** means refreshing the tab doesn't lose your work. **"Forget everything"** wipes it instantly.

## What runs where

- **Browser-only:** every byte of your statement, every receipt photo, every prompt, every model weight after first download.
- **Server:** static asset hosting only. No API, no logs, no analytics.

There is no backend. Open the network tab during use — you'll see one big download (the model, cached after first load), and nothing else leaving your machine.

## Architecture

```
file/photo/question
  │
  ├─ parser/ (CSV → Transaction[])
  ├─ engine/ (Gemma 4 via Transformers.js + WebGPU)
  │   ├─ categorize.ts  ← text classification
  │   ├─ receipt.ts     ← vision: image → merchant/amount/date
  │   └─ qa.ts          ← text: free-form Q&A grounded in your data
  ├─ analytics/ (pure deterministic math — totals, MoM, recurring)
  └─ storage/ (IndexedDB)
       │
       ↓
      UI (React)
```

**Key invariant:** the LLM categorizes and reasons; `analytics/` does all the math. LLMs hallucinate sums; pure functions don't.

## Tech stack

- Next.js 16 (App Router) · React 19 · TypeScript
- `@huggingface/transformers` v3 on WebGPU
- `onnx-community/gemma-4-E2B-it-ONNX` with `dtype: "q4f16"`
- Tailwind v4
- IndexedDB via `idb`
- Vitest for parser + analytics tests
- Deployed on Vercel with cross-origin-isolated headers

## Local dev

```bash
npm install
cp .env.local.example .env.local        # optional — only needed for cloud mode
# add your OPENROUTER_API_KEY to .env.local (get a free key at openrouter.ai/keys)
npm run dev
# open http://localhost:3000
```

First on-device model load downloads ~1.5GB (E2B) or ~2.5GB (E4B) from Hugging Face, cached after. Requires a WebGPU-capable browser (Chrome 121+, Edge, Arc on modern hardware).

The cloud (Gemma 4 31B via OpenRouter) option requires `OPENROUTER_API_KEY` set as an env var — locally in `.env.local`, in production in your Vercel project settings. The server holds the key; it's never exposed to the browser.

```bash
npm test        # parser + analytics unit tests
npm run build   # production build
npm start       # production server with COOP/COEP headers
```

## Why Gemma 4 E2B specifically

PocketCFO has four non-negotiable constraints, and **E2B** is the smallest Gemma 4 variant that meets all four:

1. **Runs in a browser tab** — must fit WebGPU memory *and* download in a reasonable amount of time.
2. **Sees private financial data** — must run client-side.
3. **Reads transaction text *and* receipt photos** — must be multimodal.
4. **Reasons about a year of activity in one pass** — needs 128K context.

The 31B Dense and 26B MoE Gemma 4 variants are too large for browser inference today. The E4B variant is more capable but ~2.5GB to download — too slow for first-time users and judges loading the demo. **E2B hits the sweet spot**: same multimodal capabilities, same 128K context, roughly half the cold-load time of E4B. Crucially, the multimodality is what makes the choice non-trivial — without the vision encoder, the receipt-snap flow doesn't work and the project collapses to a text-only tool that Gemma 3 could have done.

## License

MIT.
