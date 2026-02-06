import { prisma } from "@/lib/prisma";
import { deleteExpense } from "./actions";
import ExpenseFormClient from "./ExpenseFormClient";
import EditExpenseButton from "./EditExpenseButton";

export const dynamic = "force-dynamic";

function chf(cents: number) {
  return `CHF ${(cents / 100).toFixed(2)}`;
}

function monthKey(d: Date) {
  const x = new Date(d);
  const yyyy = x.getFullYear();
  const mm = String(x.getMonth() + 1).padStart(2, "0");
  return `${mm}.${yyyy}`;
}

// ✅ LABELS alignés sur ton enum Prisma (schema)
const EXPENSE_CATEGORY_LABEL: Record<string, string> = {
  RESTAURANT: "Restaurant",
  CARBURANT: "Carburant",
  PARKING: "Parking",
  FOURNITURES: "Fournitures",
  OUTILLAGE: "Outillage",
  TELEPHONE: "Téléphone",
  INTERNET: "Internet",
  TRANSPORT: "Transport",

  LOYER: "Loyer",
  SALAIRE_EMPLOYE: "Salaires employés",
  SALAIRE_CADRE: "Salaires cadres",
  ASSURANCE_MALADIE: "Assurance maladie",
  ASSURANCE_LPP: "Assurance LPP",
  ASSURANCE_VEHICULE: "Assurance véhicule",
  REPARATION_VEHICULE: "Réparation véhicule",

  DIVERS: "Divers",
};

function catLabel(key: string) {
  return EXPENSE_CATEGORY_LABEL[key] ?? key;
}

export default async function ExpensesPage(props: { searchParams?: Promise<any> }) {
  const sp = (await props.searchParams) ?? {};
  const year = Number(sp.year ?? new Date().getFullYear());
  const yearStart = new Date(`${year}-01-01T00:00:00.000Z`);
  const yearEnd = new Date(`${year + 1}-01-01T00:00:00.000Z`);

  const expenses = await prisma.expense.findMany({
    where: { date: { gte: yearStart, lt: yearEnd } },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  const paidInvoices = await prisma.invoice.findMany({
    where: {
      status: "PAID",
      OR: [
        { paidAt: { gte: yearStart, lt: yearEnd } },
        { paidAt: null, updatedAt: { gte: yearStart, lt: yearEnd } },
      ],
    },
    select: {
      amountGrossCents: true,
      amountNetCents: true,
      amountVatCents: true,
      paidAmountCents: true,
    },
  });

  const paidGross = paidInvoices.reduce(
    (s, i) => s + (i.paidAmountCents ?? i.amountGrossCents),
    0
  );
  const paidNet = paidInvoices.reduce((s, i) => s + i.amountNetCents, 0);
  const paidVat = paidInvoices.reduce((s, i) => s + i.amountVatCents, 0);

  const expGross = expenses.reduce((s, e) => s + e.amountGrossCents, 0);
  const expNet = expenses.reduce((s, e) => s + e.amountNetCents, 0);
  const expVat = expenses.reduce((s, e) => s + e.amountVatCents, 0);

  const vatNet = paidVat - expVat;

  // Résumé par mois (TTC par catégorie)
  const byMonth = new Map<string, { total: number; byCat: Record<string, number> }>();
  for (const e of expenses) {
    const key = monthKey(e.date as any);
    const cur = byMonth.get(key) ?? { total: 0, byCat: {} };
    cur.total += e.amountGrossCents;
    cur.byCat[e.category] = (cur.byCat[e.category] ?? 0) + e.amountGrossCents;
    byMonth.set(key, cur);
  }
  const monthRows = Array.from(byMonth.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-3xl font-extrabold tracking-tight text-slate-900">Dépenses</div>
          <div className="mt-1 text-sm text-slate-600">
            Restaurant, parking, carburant, loyer, assurances… + TVA &amp; résumé annuel
          </div>
        </div>

        <form className="flex items-center gap-2">
          <select
            name="year"
            defaultValue={String(year)}
            className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            {Array.from({ length: 6 }).map((_, i) => {
              const y = new Date().getFullYear() - 2 + i;
              return (
                <option key={y} value={y}>
                  {y}
                </option>
              );
            })}
          </select>

          <button className="rounded-2xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">
            Afficher
          </button>
        </form>
      </div>

      {/* Résumé année */}
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-600">Encaissé {year} (factures payées)</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">{chf(paidGross)}</div>
          <div className="mt-2 text-sm text-slate-600">
            HT: <span className="font-semibold text-slate-900">{chf(paidNet)}</span> · TVA encaissée:{" "}
            <span className="font-semibold text-slate-900">{chf(paidVat)}</span>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-600">Payé {year} (dépenses)</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">{chf(expGross)}</div>
          <div className="mt-2 text-sm text-slate-600">
            HT: <span className="font-semibold text-slate-900">{chf(expNet)}</span> · TVA payée:{" "}
            <span className="font-semibold text-slate-900">{chf(expVat)}</span>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-600">TVA nette {year}</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">{chf(vatNet)}</div>
          <div className="mt-2 text-sm text-slate-600">(TVA encaissée - TVA payée)</div>
        </div>
      </div>

      {/* Ajouter dépense + Résumé mois */}
      <div className="mt-6 grid gap-3 lg:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-lg font-extrabold text-slate-900">+ Ajouter une dépense</div>
          <div className="mt-4">
            <ExpenseFormClient mode="create" />
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="text-lg font-extrabold text-slate-900">Résumé par mois</div>

          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-xs text-slate-600">
                <tr className="border-b">
                  <th className="py-2 text-left">Mois</th>
                  <th className="py-2 text-right">Total TTC</th>
                  <th className="py-2 text-left">Détails</th>
                </tr>
              </thead>

              <tbody>
                {monthRows.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-4 text-slate-600">
                      Aucune dépense sur {year}.
                    </td>
                  </tr>
                ) : (
                  monthRows.map(([m, v]) => {
                    const cats = Object.entries(v.byCat).sort((a, b) => b[1] - a[1]);
                    return (
                      <tr key={m} className="border-b last:border-b-0 align-top">
                        <td className="py-3 font-extrabold text-slate-900">{m}</td>
                        <td className="py-3 text-right font-extrabold text-slate-900">{chf(v.total)}</td>
                        <td className="py-3">
                          <div className="flex flex-wrap gap-2">
                            {cats.map(([k, cents]) => (
                              <span
                                key={k}
                                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-800"
                              >
                                {catLabel(k)}
                                <span className="font-extrabold text-slate-900">{chf(cents)}</span>
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Liste */}
      <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="text-lg font-extrabold text-slate-900">Liste des dépenses ({year})</div>

        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-xs text-slate-600">
              <tr className="border-b">
                <th className="py-2 text-left">Date</th>
                <th className="py-2 text-left">Fournisseur</th>
                <th className="py-2 text-left">Catégorie</th>
                <th className="py-2 text-right">TTC</th>
                <th className="py-2 text-right">TVA</th>
                <th className="py-2 text-left">Actions</th>
              </tr>
            </thead>

            <tbody>
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-4 text-slate-600">
                    Aucune dépense pour {year}.
                  </td>
                </tr>
              ) : (
                expenses.map((e) => (
                  <tr key={e.id} className="border-b last:border-b-0">
                    <td className="py-2">{new Date(e.date as any).toLocaleDateString()}</td>
                    <td className="py-2 font-semibold text-slate-900">{e.vendor}</td>
                    <td className="py-2">{catLabel(e.category)}</td>
                    <td className="py-2 text-right font-semibold text-slate-900">{chf(e.amountGrossCents)}</td>
                    <td className="py-2 text-right">{chf(e.amountVatCents)}</td>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-2">
                        <EditExpenseButton expense={e} />
                        <form
                          action={async () => {
                            "use server";
                            await deleteExpense(e.id);
                          }}
                        >
                          <button className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-100">
                            Supprimer
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 text-xs text-slate-500">
          * Les totaux TVA/HT sont calculés automatiquement depuis le TTC et le taux TVA.
        </div>
      </div>
    </div>
  );
}
