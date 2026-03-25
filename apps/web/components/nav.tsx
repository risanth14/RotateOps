"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/integrations", label: "Integrations" },
  { href: "/policies", label: "Policies" },
  { href: "/jobs", label: "Jobs" },
  { href: "/audit", label: "Audit" }
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <aside className="w-full rounded-2xl bg-white/80 p-4 shadow-md shadow-slate-200 md:w-60">
      <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">RotateOps</p>
      <nav className="space-y-2">
        {links.map((link) => {
          const active = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`block rounded-xl px-3 py-2 text-sm font-medium transition ${
                active ? "bg-slateBlue text-white" : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
