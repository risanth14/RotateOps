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
    <aside className="panel w-full p-4 md:sticky md:top-6 md:h-fit md:w-64">
      <div className="mb-5 flex items-center gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slateBlue text-sm font-bold text-white shadow-sm">
          RO
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">RotateOps</p>
          <p className="text-xs text-slate-500">Security Console</p>
        </div>
      </div>
      <nav className="space-y-2">
        {links.map((link) => {
          const active = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`block rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-gradient-to-r from-slateBlue to-slate-700 text-white shadow-sm"
                  : "text-slate-700 hover:bg-slate-100"
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
