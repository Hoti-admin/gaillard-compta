import Link from "next/link";
import { prisma } from "@/lib/prisma";
import SalaryFormClient from "./SalaryFormClient";
import { deleteSalary } from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function chf(cents: number) {
  return `CHF ${(cents / 100).toFixed(2)}`;
}

function yyyyMm(d: Date) {
  const x = new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function monthLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  return d.toLocaleDateString("fr-CH", { month: "long", year: "numeric" });
}

function getLastMonths(count = 12) {
  const res: string[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    res.push(yyyyMm(d));
  }
  return res;
}

const CATEGORY_LABEL: Record<string, string> = {
  SALAIRE_EMPLOYE: "Salaire employé",
  SALAIRE_CADRE: "Salaire cadre",
};

export default async function SalariesPage(props: { searchParams?: Promise<any> }) {
  const sp = (await props.searchParams) ?? {};
  const ym = String(sp.ym ?? yyyyMm(new Date())); // ex: 2026-02

  const [yearStr, monthStr] = ym.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);

  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0));

  const salaries = await prisma.expense.findMany({
    where: {
      date: { gte: start, lt: end },
      category: { in: ["SALAIRE_EMPLOYE", "SALAIRE_CADRE"] },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  const total = salaries.reduce((s, e) => s + e.amountGrossCents, 0);

  const months = getLastMonths(12);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-3xl font-extrabold tracking-tight text-slate-900">Salaires</div>
          <div className="mt-1 text-sm text-slate-600">
            Clique un mois · Ajoute les salaires · Total automatique
          </div>
        </div>

        <form className="flex items-center gap-2">
          <input
            name="ym"
            type="month"
            defaultValue={ym}
            className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
          />
          <button className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
            Afficher
          </button>
        </form>
      </div>

      {/* ✅ Mois cliquables */}
      <div className="mt-5 flex flex-wrap gap-2">
        {months.map((m) => {
          const active = m === ym;
          return (
            <Link
              key={m}
              href={`/salaries?ym=${m}`}
              className={[
                "rounded-2xl px-3 py-2 text-sm font-semibold transition",
                active
                  ? "bg-blue-700 text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
              ].join(" ")}
            >
              {monthLabel(m)}
            </Link>
          );
        })}
      </div>

      <div className="mt-6 grid gap-3 lg:grid-cols-3">
        {/* Formulaire */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-lg font-extrabold text-slate-900">+ Ajouter un salaire</div>
          <div className="mt-1 text-xs text-slate-500">Mois sélectionné : {monthLabel(ym)}</div>

          <div className="mt-4">
            <SalaryFormClient defaultYm={ym} />
          </div>
        </div>

        {/* Tableau */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-lg font-extrabold text-slate-900">Résumé</div>
              <div className="text-xs text-slate-500">{monthLabel(ym)}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm">
              Total : <span className="font-extrabold">{chf(total)}</span>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-xs text-slate-600">
                <tr className="border-b">
                  <th className="py-2 text-left">Date</th>
                  <th className="py-2 text-left">Employé</th>
                  <th className="py-2 text-left">Type</th>
                  <th className="py-2 text-right">Montant</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {salaries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-4 text-slate-600">
                      Aucun salaire sur {monthLabel(ym)}.
                    </td>
                  </tr>
                ) : (
                  salaries.map((s) => (
                    <tr key={s.id} className="border-b last:border-b-0">
                      <td className="py-2">{new Date(s.date as any).toLocaleDateString()}</td>
                      <td className="py-2 font-semibold text-slate-900">{s.vendor}</td>
                      <td className="py-2 text-slate-700">
                        {CATEGORY_LABEL[String(s.category)] ?? String(s.category)}
                      </td>
                      <td className="py-2 text-right font-semibold text-slate-900">
                        {chf(s.amountGrossCents)}
                      </td>
                      <td className="py-2 text-right">
                        <form
                          action={async () => {
                            "use server";
                            await deleteSalary(s.id);
                          }}
                        >
                          <button className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-100">
                            Supprimer
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3 text-xs text-slate-500">
            * Stocké dans Dépenses (Expense) avec catégorie SALAIRE_EMPLOYE / SALAIRE_CADRE.
          </div>
        </div>
      </div>
    </div>
  );
}
