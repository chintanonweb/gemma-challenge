"use client";

import { MODELS, getModelKey } from "@/lib/engine/client";

const ENDPOINT = "/api/openrouter";

interface Opts {
  maxNewTokens?: number;
  temperature?: number;
}

function modelId(): string {
  return MODELS[getModelKey()].id;
}

export async function generateOpenRouter(prompt: string, opts: Opts = {}): Promise<string> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: modelId(),
      messages: [{ role: "user", content: prompt }],
      max_tokens: opts.maxNewTokens ?? 256,
      temperature: opts.temperature ?? 0.2,
      stream: false,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

export async function streamOpenRouter(
  prompt: string,
  onToken: (chunk: string) => void,
  opts: Opts = {},
): Promise<string> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: modelId(),
      messages: [{ role: "user", content: prompt }],
      max_tokens: opts.maxNewTokens ?? 256,
      temperature: opts.temperature ?? 0.2,
      stream: true,
    }),
  });
  if (!res.ok || !res.body) {
    const text = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${text.slice(0, 200)}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]") continue;
      try {
        const evt = JSON.parse(payload) as {
          choices?: Array<{ delta?: { content?: string } }>;
        };
        const delta = evt.choices?.[0]?.delta?.content ?? "";
        if (delta) {
          full += delta;
          onToken(delta);
        }
      } catch {
        // ignore malformed SSE frames
      }
    }
  }
  return full.trim();
}

export async function extractReceiptOpenRouter(
  imageBlob: Blob,
  prompt: string,
): Promise<string> {
  const dataUrl = await blobToDataUrl(imageBlob);
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: modelId(),
      messages: [
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: dataUrl } },
            { type: "text", text: prompt },
          ],
        },
      ],
      max_tokens: 100,
      temperature: 0,
      stream: false,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenRouter vision error ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(blob);
  });
}
