"use client";

import { useEffect, useState } from "react";
import {
  getProvider,
  loadModel,
  subscribeProgress,
  type ModelProgress,
} from "@/lib/engine/client";

export function useModel(autoLoad = false) {
  const [progress, setProgress] = useState<ModelProgress | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const provider = getProvider();
  // Cloud provider needs no download; mark ready immediately.
  useEffect(() => {
    if (provider === "openrouter") setReady(true);
  }, [provider]);

  useEffect(() => {
    const unsub = subscribeProgress(setProgress);
    return unsub;
  }, []);

  useEffect(() => {
    if (!autoLoad) return;
    setLoading(true);
    loadModel()
      .then(() => setReady(true))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [autoLoad]);

  const start = () => {
    if (loading || ready) return;
    setLoading(true);
    loadModel()
      .then(() => setReady(true))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  };

  return { ready, progress, error, loading, start, provider };
}
