"use client";

import { useEffect, useRef, useState } from "react";
import { loadStatement, saveStatement, wipeStatement } from "@/lib/storage/idb";
import type { Transaction } from "@/lib/types";

export function useStatement() {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    loadStatement()
      .then((v) => {
        if (v) setTxs(v);
      })
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (txs.length === 0) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      void saveStatement(txs);
    }, 400);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [txs, hydrated]);

  const forget = async () => {
    await wipeStatement();
    setTxs([]);
  };

  return { txs, setTxs, forget, hydrated };
}
