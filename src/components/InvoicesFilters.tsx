"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Props = {
  years: number[];
};

export default function InvoicesFilters({ years }: Props) {
  const router = useRouter();
  const sp = useSearchParams();

  const currentYear = new Date().getFullYear();

  const [q, setQ] = useState(sp.get("q") ?? "");
  const [status, setStatus] = useState(sp.get("status") ?? "ALL");
  const [year, setYear] = useState(sp.get("year") ?? String(currentYear));
  const [overdue, setOverdue] = useState(sp.get("overdue") ?? "0");
  const [sort, setSort] = useState(sp.get("sort") ?? "due");

  const url = useMemo(() => {
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (status && status !== "ALL") p.set("status", status);
    if (year) p.set("year", year);
    if (overdue === "1") p.set("overdue", "1");
    if (sort && sort !== "due") p.set("sort", sort);
    return `/invoices?${p.toString()}`;
  }, [q, status, year, overdue, sort]);

  function apply() {
    router.push(url);
  }

  function reset() {
    router.push("/invoices");
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-5">
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-slate-600">Recherche</label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="N° facture ou nom client…"
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-slate-300"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">Année</label>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-slate-300"
            >
              {[...new Set([currentYear, ...years])].sort((a, b) => b - a).map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">Statut</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-slate-300"
            >
              <option value="ALL">Tous</option>
              <option value="OPEN">Ouvertes</option>
              <option value="PARTIAL">Partielles</option>
              <option value="PAID">Payées</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">Tri</label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-slate-300"
            >
              <option value="due">Échéance</option>
              <option value="issue">Date facture</option>
              <option value="amount">Montant</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={overdue === "1"}
              onChange={(e) => setOverdue(e.target.checked ? "1" : "0")}
              className="h-4 w-4"
            />
            Retard uniquement
          </label>

          <button
            onClick={apply}
            className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
          >
            Appliquer
          </button>

          <button
            onClick={reset}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
