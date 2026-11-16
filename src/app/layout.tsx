import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AeroSettle — Global Aviation Payment & XRPL Settlement Platform",
  description:
    "Enterprise B2B aviation financial operating system powered by the XRP Ledger for international fuel uplift, MRO overhaul, aircraft parts, and ground handling settlement.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
