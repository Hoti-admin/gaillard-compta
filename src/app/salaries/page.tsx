import { prisma } from "@/lib/prisma";
import { createSalary, deleteSalary } from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function chf(cents: number) {
  return `CHF ${(cents / 100).toFixed(2)}`;
}

function ymKey(d: Date) {
  const x = new Date(d);
  const yyyy = x.getFullYear();
  const mm = String(x.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}

function ymLabel(key: string) {
  const [y, m] = key.split("-");
  return `${m}.${y}`;
}

const CAT_LABEL: Record<string, string> = {
  SALAIRE_EMPLOYE: "Salaire employé",
  SALAIRE_CADRE: "Salaire cadre",
  SALAIRE_EMPLOYES: "Salaire employés",
  SALAIRE_CADRES: "Salaire cadres",
};

export default async function SalariesPage(props: { searchParams?: Promise<any> }) {
  const sp = (await props.searchParams) ?? {};
  const year = Number(sp.year ?? new Date().getFullYear());

  const yearStart = new Date(`${year}-01-01T00:00:00.000Z`);
  const yearEnd = new Date(`${year + 1}-01-01T00:00:00.000Z`);

  // ✅ On accepte les 4 noms possibles (selon DB)
  const salaryCats = ["SALAIRE_EMPLOYE", "SALAIRE_CADRE", "SALAIRE_EMPLOYES", "SALAIRE_CADRES"];

  const rows = await prisma.expense.findMany({
    where: {
      date: { gte: yearStart, lt: yearEnd },
      category: { in: salaryCats as any },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      date: true,
      vendor: true,
      category: true,
      amountGrossCents: true,
    },
  });

  const total = rows.reduce((s, r) => s + r.amountGrossCents, 0);

  // group by month
  const byMonth = new Map<string, typeof rows>();
  for (const r of rows) {
    const k = ymKey(r.date as any);
    const cur = byMonth.get(k) ?? [];
    cur.push(r);
    byMonth.set(k, cur);
  }
  const months = Array.from(byMonth.keys()).sort((a, b) => (a < b ? 1 : -1));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-3xl font-extrabold tracking-tight text-slate-900">Salaires</div>
          <div className="mt-1 text-sm text-slate-600">Saisie mensuelle par employé (année {year})</div>
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

      {/* Résumé */}
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-600">TOTAL SALAIRES {year}</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">{chf(total)}</div>
          <div className="mt-2 text-xs text-slate-500">Stocké comme “Dépense” (TVA = 0)</div>
        </div>

        {/* Formulaire */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:col-span-2">
          <div className="text-lg font-extrabold text-slate-900">+ Ajouter un salaire</div>

          <form action={createSalary} className="mt-4 grid gap-3 md:grid-cols-4">
            <input
              name="employee"
              placeholder="Nom employé"
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
              required
            />

            <select
              name="type"
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
              defaultValue="SALAIRE_EMPLOYE"
            >
              <option value="SALAIRE_EMPLOYE">Employé</option>
              <option value="SALAIRE_CADRE">Cadre</option>
            </select>

            <input
              type="date"
              name="date"
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
              required
            />

            <input
              name="amount"
              placeholder="Montant CHF (ex 5200)"
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
              required
            />

            <button className="md:col-span-4 rounded-2xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">
              Enregistrer
            </button>
          </form>

          <div className="mt-2 text-xs text-slate-500">
            Astuce: tu peux choisir le mois via la date (ex: 2026-02-01).
          </div>
        </div>
      </div>

      {/* Par mois */}
      <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="text-lg font-extrabold text-slate-900">Salaires par mois ({year})</div>

        {months.length === 0 ? (
          <div className="mt-3 text-sm text-slate-600">Aucun salaire saisi pour {year}.</div>
        ) : (
          <div className="mt-4 grid gap-4">
            {months.map((m) => {
              const list = byMonth.get(m) ?? [];
              const subtotal = list.reduce((s, r) => s + r.amountGrossCents, 0);

              return (
                <div key={m} className="rounded-2xl border border-slate-200">
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 px-4 py-3">
                    <div className="font-extrabold text-slate-900">{ymLabel(m)}</div>
                    <div className="text-sm font-semibold text-slate-900">Total: {chf(subtotal)}</div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="text-xs font-semibold text-slate-600">
                        <tr className="border-b">
                          <th className="px-4 py-2 text-left">Date</th>
                          <th className="px-4 py-2 text-left">Employé</th>
                          <th className="px-4 py-2 text-left">Type</th>
                          <th className="px-4 py-2 text-right">Montant</th>
                          <th className="px-4 py-2 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {list.map((r) => (
                          <tr key={r.id} className="border-b last:border-b-0">
                            <td className="px-4 py-2">{new Date(r.date as any).toLocaleDateString()}</td>
                            <td className="px-4 py-2 font-semibold text-slate-900">{r.vendor}</td>
                            <td className="px-4 py-2 text-slate-700">{CAT_LABEL[String(r.category)] ?? String(r.category)}</td>
                            <td className="px-4 py-2 text-right font-semibold text-slate-900">{chf(r.amountGrossCents)}</td>
                            <td className="px-4 py-2 text-right">
                              <form
                                action={async () => {
                                  "use server";
                                  await deleteSalary(r.id);
                                }}
                              >
                                <button className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-100">
                                  Supprimer
                                </button>
                              </form>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
