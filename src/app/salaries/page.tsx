import { prisma } from "@/lib/prisma";
import SalariesClient from "./salaries-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function chf(cents: number) {
  return `CHF ${(cents / 100).toFixed(2)}`;
}

function monthLabel(y: number, m: number) {
  const mm = String(m).padStart(2, "0");
  return `${mm}.${y}`;
}

export default async function SalariesPage(props: { searchParams?: Promise<any> }) {
  const sp = (await props.searchParams) ?? {};
  const year = Number(sp.year ?? new Date().getFullYear());
  const month = Number(sp.month ?? new Date().getMonth() + 1);

  const employees = await prisma.employee.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, type: true },
  });

  const salaries = await prisma.salary.findMany({
    where: { year, month },
    orderBy: { employee: { name: "asc" } },
    include: { employee: { select: { id: true, name: true, type: true } }, expense: true },
  });

  const yearSalaries = await prisma.salary.findMany({
    where: { year },
    select: { grossCents: true, chargesCents: true, netCents: true, month: true },
  });

  const monthTotal = salaries.reduce(
    (acc, s) => {
      acc.gross += s.grossCents;
      acc.charges += s.chargesCents;
      acc.net += s.netCents;
      return acc;
    },
    { gross: 0, charges: 0, net: 0 }
  );

  const yearTotal = yearSalaries.reduce(
    (acc, s) => {
      acc.gross += s.grossCents;
      acc.charges += s.chargesCents;
      acc.net += s.netCents;
      return acc;
    },
    { gross: 0, charges: 0, net: 0 }
  );

  const months = Array.from({ length: 12 }).map((_, i) => i + 1);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-3xl font-extrabold tracking-tight text-slate-900">Salaires</div>
          <div className="mt-1 text-sm text-slate-600">
            Suivi mensuel & annuel · Brut / Charges / Net · Liaison automatique avec Dépenses
          </div>
        </div>

        <form className="flex items-center gap-2">
          <select
            name="year"
            defaultValue={String(year)}
            className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            {Array.from({ length: 7 }).map((_, i) => {
              const y = new Date().getFullYear() - 3 + i;
              return (
                <option key={y} value={y}>
                  {y}
                </option>
              );
            })}
          </select>

          <button className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
            Appliquer
          </button>
        </form>
      </div>

      {/* Onglets mois */}
      <div className="mt-5 flex flex-wrap gap-2">
        {months.map((m) => {
          const active = m === month;
          return (
            <a
              key={m}
              href={`/salaries?year=${year}&month=${m}`}
              className={[
                "rounded-2xl px-3 py-2 text-sm font-semibold",
                active ? "bg-blue-700 text-white" : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50",
              ].join(" ")}
            >
              {monthLabel(year, m)}
            </a>
          );
        })}
      </div>

      {/* Résumé */}
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-600">TOTAL DU MOIS ({monthLabel(year, month)})</div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold text-slate-600">Brut</div>
              <div className="mt-1 text-lg font-extrabold text-slate-900">{chf(monthTotal.gross)}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold text-slate-600">Charges</div>
              <div className="mt-1 text-lg font-extrabold text-slate-900">{chf(monthTotal.charges)}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold text-slate-600">Net</div>
              <div className="mt-1 text-lg font-extrabold text-slate-900">{chf(monthTotal.net)}</div>
            </div>
          </div>
          <div className="mt-3 text-xs text-slate-500">
            * Une dépense “Salaire” est créée automatiquement (sans TVA) = Brut + Charges.
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-600">TOTAL ANNÉE ({year})</div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold text-slate-600">Brut</div>
              <div className="mt-1 text-lg font-extrabold text-slate-900">{chf(yearTotal.gross)}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold text-slate-600">Charges</div>
              <div className="mt-1 text-lg font-extrabold text-slate-900">{chf(yearTotal.charges)}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold text-slate-600">Net</div>
              <div className="mt-1 text-lg font-extrabold text-slate-900">{chf(yearTotal.net)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Client component (forms + table) */}
      <div className="mt-6">
        <SalariesClient year={year} month={month} employees={employees} salaries={salaries} />
      </div>
    </div>
  );
}
