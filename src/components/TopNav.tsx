"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/clients", label: "Clients" },
  { href: "/invoices", label: "Factures" },
  { href: "/suppliers", label: "Fournisseurs" },
  { href: "/bills", label: "Achats" },
  { href: "/expenses", label: "Dépenses" },
];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function TopNav() {
  const pathname = usePathname();

  const year = new Date().getFullYear();
  const exportExpensesHref = `/api/exports/expenses.xlsx?year=${year}`;

  return (
    <nav className="flex flex-wrap items-center justify-end gap-2">
      {NAV.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cx(
              "rounded-2xl px-3 py-2 text-sm font-semibold transition",
              active
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-700 hover:bg-slate-100"
            )}
          >
            {item.label}
          </Link>
        );
      })}

      {/* Export Excel Dépenses */}
      <a
        href={exportExpensesHref}
        className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
        title="Télécharger l’export Excel des dépenses"
      >
        Export Dépenses Excel
      </a>

      {/* Auth */}
      <div className="mx-1 h-6 w-px bg-slate-200" />

      <Link
        href="/logout"
        className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        Déconnexion
      </Link>
    </nav>
  );
}
