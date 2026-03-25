import type { Metadata } from "next";
import { Navigation } from "../components/nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "RotateOps",
  description: "Deterministic credential rotation orchestrator"
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <div className="mx-auto flex max-w-7xl flex-col gap-4 p-5 md:flex-row">
          <Navigation />
          <main className="min-h-[85vh] flex-1 rounded-2xl bg-white/85 p-5 shadow-lg shadow-slate-200">{children}</main>
        </div>
      </body>
    </html>
  );
}
