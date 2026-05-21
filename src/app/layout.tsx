import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PocketCFO — your private finance brain",
  description:
    "Drop a bank statement, get instant categorization, subscription detection, and natural-language answers. Powered by Gemma 4 running in your browser. Your data never leaves this tab.",
  openGraph: {
    title: "PocketCFO",
    description: "On-device personal finance with Gemma 4. Your bank data never leaves this tab.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
