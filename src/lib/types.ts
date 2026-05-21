export type Category =
  | "groceries"
  | "restaurants"
  | "transport"
  | "utilities"
  | "subscriptions"
  | "shopping"
  | "entertainment"
  | "health"
  | "travel"
  | "income"
  | "transfer"
  | "fees"
  | "other";

export interface Transaction {
  id: string;
  date: string;
  merchant: string;
  rawDescription: string;
  amount: number;
  category?: Category;
  source?: "csv" | "receipt" | "manual";
}

export interface Recurring {
  merchant: string;
  amount: number;
  cadenceDays: number;
  occurrences: number;
  firstDate: string;
  lastDate: string;
  annualTotal: number;
}

export interface CategoryStat {
  category: Category;
  total: number;
  count: number;
}
