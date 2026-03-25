import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import { Navigation } from "../components/nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "RotateOps",
  description: "Deterministic credential rotation orchestrator"
};

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap"
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap"
});

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${manrope.variable} ${spaceGrotesk.variable}`} suppressHydrationWarning>
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-sky-200/50 blur-3xl" />
          <div className="absolute -right-16 top-36 h-80 w-80 rounded-full bg-cyan-100/40 blur-3xl" />
          <div className="absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-amber-100/45 blur-3xl" />
        </div>
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 p-4 md:gap-6 md:p-6 lg:flex-row">
          <Navigation />
          <main className="min-h-[88vh] flex-1 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-xl shadow-slate-200/60 backdrop-blur md:p-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
