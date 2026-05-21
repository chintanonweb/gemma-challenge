import Papa from "papaparse";
import type { Transaction } from "@/lib/types";

const isoDate = (s: string): string | null => {
  const trimmed = s?.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const us = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (us) {
    const [, m, d, y] = us;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const eu = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (eu) {
    const [, d, m, y] = eu;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
};

const cleanMerchant = (raw: string): string => {
  return raw
    .replace(/\s*#\d+\s*/g, " ")
    .replace(/,\s*[A-Z][A-Z\s.]+$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .join(" ");
};

const hash = (s: string): string => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
};

const pick = (row: Record<string, string>, ...keys: string[]): string => {
  for (const k of keys) {
    const v = row[k] ?? row[k.toLowerCase()] ?? row[k.toUpperCase()];
    if (v != null && String(v).trim() !== "") return String(v);
  }
  return "";
};

export function parseCsv(text: string): Transaction[] {
  const { data } = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });
  const out: Transaction[] = [];
  for (const row of data) {
    const dateRaw = pick(row, "Date", "Posted Date", "Transaction Date");
    const date = isoDate(dateRaw);
    if (!date) continue;
    const desc = pick(row, "Description", "Memo", "Details", "Name").trim();
    const amountRaw = pick(row, "Amount", "Debit", "Credit").replace(/[,$]/g, "");
    const amount = Number(amountRaw);
    if (!Number.isFinite(amount)) continue;
    const merchant = cleanMerchant(desc);
    out.push({
      id: hash(`${date}|${merchant}|${amount}`),
      date,
      merchant,
      rawDescription: desc,
      amount,
      source: "csv",
    });
  }
  return out;
}
