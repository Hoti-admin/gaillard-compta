import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function chf(cents: number) {
  return `CHF ${(cents / 100).toFixed(2)}`;
}

export default async function ExpensesPage(props: { searchParams?: Promise<any> }) {
  const sp = (await props.searchParams) ?? {};
  const year = Number(sp.year ?? new Date().getFullYear());

  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year + 1, 0, 1));

  const expenses = await prisma.expense.findMany({
    where: {
      date: {
        gte: start,
        lt: end,
      },
    },
    orderBy: { date: "desc" },
    select: {
      id: true,
      date: true,
      vendor: true,
      category: true,
      vatRateBp: true,
      amountGrossCents: true,
      amountNetCents: true,
      amountVatCents: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
      salaryId: true,
    },
  });

  const yearTotal = expenses.reduce(
    (acc, e) => {
      acc.gross += e.amountGrossCents;
      acc.vat += e.amountVatCents;
      return acc;
    },
    { gross: 0, vat: 0 }
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-3xl font-extrabold tracking-tight text-slate-900">Dépenses</div>
          <div className="mt-1 text-sm text-slate-600">Liste des dépenses (année {year})</div>
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
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-600">TOTAL DÉPENSES ({year})</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">{chf(yearTotal.gross)}</div>
          <div className="mt-1 text-sm text-slate-600">TVA payée: {chf(yearTotal.vat)}</div>
        </div>
      </div>

      {/* Table */}
      <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
            <tr>
              <th className="px-3 py-2 text-left">Date</th>
              <th className="px-3 py-2 text-left">Fournisseur</th>
              <th className="px-3 py-2 text-left">Catégorie</th>
              <th className="px-3 py-2 text-right">TTC</th>
              <th className="px-3 py-2 text-right">TVA</th>
              <th className="px-3 py-2 text-left">Notes</th>
            </tr>
          </thead>
          <tbody>
            {expenses.length ? (
              expenses.map((e) => (
                <tr key={e.id} className="border-t border-slate-200">
                  <td className="px-3 py-2">
                    {new Date(e.date).toLocaleDateString("fr-CH")}
                  </td>
                  <td className="px-3 py-2 font-semibold text-slate-900">{e.vendor}</td>
                  <td className="px-3 py-2 text-slate-700">{e.category}</td>
                  <td className="px-3 py-2 text-right font-semibold">{chf(e.amountGrossCents)}</td>
                  <td className="px-3 py-2 text-right">{chf(e.amountVatCents)}</td>
                  <td className="px-3 py-2 text-slate-600">{e.notes ?? "—"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-slate-500">
                  Aucune dépense trouvée pour {year}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
