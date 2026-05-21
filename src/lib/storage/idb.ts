import { openDB, type IDBPDatabase } from "idb";
import type { Transaction } from "@/lib/types";

const DB_NAME = "pocketcfo";
const STORE = "statements";
const KEY = "current";
const VERSION = 1;

interface StoredStatement {
  txs: Transaction[];
  savedAt: number;
}

let dbp: Promise<IDBPDatabase> | null = null;

const db = () =>
  (dbp ??= openDB(DB_NAME, VERSION, {
    upgrade(d) {
      if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE);
    },
  }));

export async function saveStatement(txs: Transaction[]): Promise<void> {
  const d = await db();
  const payload: StoredStatement = { txs, savedAt: Date.now() };
  await d.put(STORE, payload, KEY);
}

export async function loadStatement(): Promise<Transaction[] | null> {
  const d = await db();
  const v = (await d.get(STORE, KEY)) as StoredStatement | undefined;
  return v?.txs ?? null;
}

export async function wipeStatement(): Promise<void> {
  const d = await db();
  await d.delete(STORE, KEY);
}
