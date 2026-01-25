import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Container, Card, PageTitle, Badge, Button, Select, Input } from "@/components/ui";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, any>;
};

function toYear(v: any, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 2000 && n <= 2100 ? n : fallback;
}

function moneyFromCents(cents: number) {
  return (cents / 100).toFixed(2);
}

const CAT_LABELS: Record<string, string> = {
  RESTAURANT: "Restaurant",
  PARKING: "Parking",
  CARBURANT: "Carburant",
  DIVERS: "Divers",
};

function monthKey(d: Date) {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  return `${y}-${String(m).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [y, m] = key.split("-");
  return `${m}.${y}`;
}

export default async function ExpensesPage({ searchParams }: PageProps) {
  const sp = await Promise.resolve(searchParams ?? {});
  const now = new Date();
  const currentYear = now.getFullYear();
  const year = toYear((sp as any)?.year, currentYear);

  const from = new Date(Date.UTC(year, 0, 1, 0, 0, 0));
  const to = new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0));

  const expenses = await prisma.expense.findMany({
    where: { date: { gte: from, lt: to } },
    orderBy: { date: "desc" },
  });

  // ✅ Résumé par mois / catégorie (cents)
  const summary: Record<string, Record<string, number>> = {};
  const categories = ["RESTAURANT", "PARKING", "CARBURANT", "DIVERS"];

  for (const e of expenses) {
    const key = monthKey(new Date(e.date));
    if (!summary[key]) summary[key] = {};
    const cat = String((e as any).category || "DIVERS");
    const cents = Number((e as any).amountGrossCents || 0);
    summary[key][cat] = (summary[key][cat] || 0) + cents;
  }

  // liste mois (du plus récent au plus ancien)
  const months = Object.keys(summary).sort((a, b) => (a < b ? 1 : -1));

  // totaux année
  const totalYear = expenses.reduce((s, e) => s + Number((e as any).amountGrossCents || 0), 0);

  return (
    <Container>
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <PageTitle>Dépenses</PageTitle>
          <p className="text-sm text-slate-600">
            Restaurant, parking, carburant, divers · TVA/CHF · Résumé mensuel
          </p>
        </div>

        <div className="flex items-center gap-2">
          <form className="flex items-center gap-2">
            <Select
              name="year"
              defaultValue={String(year)}
              options={[String(currentYear - 1), String(currentYear), String(currentYear + 1)]}
            />
            <Button type="submit">Afficher</Button>
          </form>

          <a
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            href={`/api/exports/expenses.pdf?year=${year}`}
          >
            Export PDF
          </a>

          <a
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            href={`/api/exports/expenses.xlsx?year=${year}`}
          >
            Export Excel
          </a>
        </div>
      </div>

      {/* KPI */}
      <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
        <Card className="p-5">
          <div className="text-xs font-semibold text-slate-500">Total dépenses {year}</div>
          <div className="mt-1 text-2xl font-extrabold text-slate-900">
            CHF {moneyFromCents(totalYear)}
          </div>
          <div className="mt-2 text-xs text-slate-500">Basé sur le TTC (amountGrossCents)</div>
        </Card>

        <Card className="p-5 md:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-bold text-slate-900">Résumé par mois</div>
            <Badge tone="neutral">{months.length} mois</Badge>
          </div>

          {months.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">Aucune dépense pour {year}.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="py-2">Mois</th>
                    <th className="py-2 text-right">Restaurant</th>
                    <th className="py-2 text-right">Parking</th>
                    <th className="py-2 text-right">Carburant</th>
                    <th className="py-2 text-right">Divers</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {months.map((m) => {
                    const row = summary[m] || {};
                    const r = row.RESTAURANT || 0;
                    const p = row.PARKING || 0;
                    const c = row.CARBURANT || 0;
                    const d = row.DIVERS || 0;
                    const t = r + p + c + d;

                    return (
                      <tr key={m} className="border-t border-slate-100">
                        <td className="py-2 font-semibold text-slate-900">{monthLabel(m)}</td>
                        <td className="py-2 text-right text-slate-900">CHF {moneyFromCents(r)}</td>
                        <td className="py-2 text-right text-slate-900">CHF {moneyFromCents(p)}</td>
                        <td className="py-2 text-right text-slate-900">CHF {moneyFromCents(c)}</td>
                        <td className="py-2 text-right text-slate-900">CHF {moneyFromCents(d)}</td>
                        <td className="py-2 text-right font-extrabold text-slate-900">CHF {moneyFromCents(t)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Liste dépenses */}
      <div className="mt-6">
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-bold text-slate-900">Liste des dépenses ({year})</div>
            <Badge tone="neutral">{expenses.length} lignes</Badge>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-2">Date</th>
                  <th className="py-2">Fournisseur</th>
                  <th className="py-2">Catégorie</th>
                  <th className="py-2 text-right">TTC</th>
                  <th className="py-2">Justificatif</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e: any) => {
                  const d = new Date(e.date);
                  const cat = String(e.category || "DIVERS");
                  const path = e.receiptPath as string | null;

                  return (
                    <tr key={e.id} className="border-t border-slate-100">
                      <td className="py-2 text-slate-700">{d.toLocaleDateString()}</td>
                      <td className="py-2 font-semibold text-slate-900">{e.vendor}</td>
                      <td className="py-2">
                        <Badge tone="neutral">{CAT_LABELS[cat] || cat}</Badge>
                      </td>
                      <td className="py-2 text-right font-semibold text-slate-900">
                        CHF {moneyFromCents(Number(e.amountGrossCents || 0))}
                      </td>

                      <td className="py-2">
                        {path ? (
                          <span className="inline-flex items-center gap-2">
                            <Badge tone="success">OK</Badge>
                            <a
                              className="text-sm font-semibold text-blue-700 hover:underline"
                              href={`/api/expenses/open?path=${encodeURIComponent(path)}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Ouvrir
                            </a>
                            <a
                              className="text-sm font-semibold text-slate-700 hover:underline"
                              href={`/api/expenses/download?path=${encodeURIComponent(path)}`}
                            >
                              Télécharger
                            </a>
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>

                      <td className="py-2 text-right">
                        <form action="/api/expenses/delete" method="POST" className="inline">
                          <input type="hidden" name="id" value={e.id} />
                          <input type="hidden" name="receiptPath" value={path ?? ""} />
                          <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50">
                            Supprimer
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}

                {expenses.length === 0 ? (
                  <tr>
                    <td className="py-6 text-center text-slate-500" colSpan={6}>
                      Aucune dépense pour {year}.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="mt-4 text-xs text-slate-500">
            * Les totaux se basent sur <b>amountGrossCents</b> (TTC).
          </div>
        </Card>
      </div>
    </Container>
  );
}
