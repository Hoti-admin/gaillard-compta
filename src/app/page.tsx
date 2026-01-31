import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function chf(cents: number) {
  return `${(cents / 100).toFixed(2)} CHF`;
}

function daysBetween(a: Date, b: Date) {
  const ms = a.getTime() - b.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export default async function DashboardPage(props: { searchParams?: Promise<any> }) {
  const sp = (await props.searchParams) ?? {};
  const year = Number(sp.year ?? new Date().getFullYear());

  const yearStart = new Date(`${year}-01-01T00:00:00.000Z`);
  const yearEnd = new Date(`${year + 1}-01-01T00:00:00.000Z`);
  const today = new Date();

  // =========================
  // 1) FACTURES (année)
  // =========================
  const invoices = await prisma.invoice.findMany({
    where: {
      issueDate: { gte: yearStart, lt: yearEnd },
      status: { not: "CANCELED" },
    },
    select: {
      id: true,
      status: true,
      dueDate: true,
      amountGrossCents: true,
      amountVatCents: true,
      paidAmountCents: true,
      clientId: true,
    },
  });

  const totalFactureCents = invoices.reduce((s, inv) => s + inv.amountGrossCents, 0);
  const totalTvaFactureeCents = invoices.reduce((s, inv) => s + inv.amountVatCents, 0);

  const openInvoices = invoices.filter((i) => i.status === "OPEN");
  const paidInvoices = invoices.filter((i) => i.status === "PAID");

  const totalAEncaisserCents = openInvoices.reduce((s, inv) => s + inv.amountGrossCents, 0);

  const totalEncaisseCents = paidInvoices.reduce(
    (s, inv) => s + (inv.paidAmountCents ?? inv.amountGrossCents),
    0
  );

  const facturesEnRetard = openInvoices.filter((inv) => new Date(inv.dueDate) < today);
  const nbRetard = facturesEnRetard.length;
  const retardCents = facturesEnRetard.reduce((s, inv) => s + inv.amountGrossCents, 0);

  const joursMax = facturesEnRetard.length
    ? Math.max(...facturesEnRetard.map((inv) => daysBetween(today, new Date(inv.dueDate))))
    : 0;

  // =========================
  // 2) DEPENSES (année)
  // =========================
  const expenses = await prisma.expense.findMany({
    where: { date: { gte: yearStart, lt: yearEnd } },
    select: {
      amountGrossCents: true,
      amountVatCents: true,
    },
  });

  const totalDepenseCents = expenses.reduce((s, e) => s + e.amountGrossCents, 0);
  const totalTvaPayeeCents = expenses.reduce((s, e) => s + e.amountVatCents, 0);

  const tvaNetteCents = totalTvaFactureeCents - totalTvaPayeeCents;

  // =========================
  // 3) TOP 10 CLIENTS ENCAISSÉS (PAID)
  // =========================
  const topPaidByClient = await prisma.invoice.groupBy({
    by: ["clientId"],
    where: {
      issueDate: { gte: yearStart, lt: yearEnd },
      status: "PAID",
    },
    _sum: {
      // On additionne paidAmountCents si présent sinon amountGrossCents.
      // Prisma groupBy ne peut pas faire "coalesce", donc on somme amountGrossCents,
      // et on recalculera avec une query simple plus bas si tu veux précision parfaite.
      amountGrossCents: true,
      paidAmountCents: true,
    },
    orderBy: {
      _sum: { amountGrossCents: "desc" },
    },
    take: 10,
  });

  const topClientIds = topPaidByClient.map((x) => x.clientId);
  const clients = topClientIds.length
    ? await prisma.client.findMany({
        where: { id: { in: topClientIds } },
        select: { id: true, name: true },
      })
    : [];
  const clientNameById = new Map(clients.map((c) => [c.id, c.name]));

  // Montant encaissé affiché : si paidAmountCents est null partout, on retombe sur TTC.
  const topClientsRows = topPaidByClient.map((x) => {
    const name = clientNameById.get(x.clientId) ?? "Client";
    const sumPaid = x._sum.paidAmountCents ?? 0;
    const sumGross = x._sum.amountGrossCents ?? 0;
    const shown = sumPaid > 0 ? sumPaid : sumGross;
    return { name, amountCents: shown };
  });

  // =========================
  // 4) TOP DEPENSES PAR CATÉGORIE
  // =========================
  const topExpensesByCategory = await prisma.expense.groupBy({
    by: ["category"],
    where: { date: { gte: yearStart, lt: yearEnd } },
    _sum: { amountGrossCents: true, amountVatCents: true },
    orderBy: { _sum: { amountGrossCents: "desc" } },
    take: 10,
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-3xl font-extrabold tracking-tight text-slate-900">Dashboard</div>
          <div className="mt-1 text-sm text-slate-600">Vue d’ensemble (filtre année : {year})</div>
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

      {/* VITRINES */}
      <div className="mt-6 grid gap-3 md:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-600">FACTURÉ (TTC) {year}</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">{chf(totalFactureCents)}</div>
          <div className="mt-2 text-xs text-slate-500">TVA facturée : {chf(totalTvaFactureeCents)}</div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-600">À ENCAISSER (OPEN)</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">{chf(totalAEncaisserCents)}</div>
          <div className="mt-2 text-xs text-slate-500">
            En retard : {chf(retardCents)} · {nbRetard} facture(s)
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-600">ENCAISSÉ (PAID)</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">{chf(totalEncaisseCents)}</div>
          <div className="mt-2 text-xs text-slate-500">
            (Prend en compte escompte si `paidAmountCents` existe)
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-600">DÉPENSÉ (TTC)</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">{chf(totalDepenseCents)}</div>
          <div className="mt-2 text-xs text-slate-500">TVA payée : {chf(totalTvaPayeeCents)}</div>
        </div>
      </div>

      {/* TVA + RETARD */}
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:col-span-2">
          <div className="text-lg font-extrabold text-slate-900">TVA (année {year})</div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold text-slate-600">TVA facturée</div>
              <div className="mt-1 text-lg font-extrabold text-slate-900">{chf(totalTvaFactureeCents)}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold text-slate-600">TVA payée</div>
              <div className="mt-1 text-lg font-extrabold text-slate-900">{chf(totalTvaPayeeCents)}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold text-slate-600">TVA nette</div>
              <div className="mt-1 text-lg font-extrabold text-slate-900">{chf(tvaNetteCents)}</div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-600">FACTURES EN RETARD</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">{nbRetard}</div>
          <div className="mt-2 text-xs text-slate-500">Jours max : {joursMax}</div>
        </div>
      </div>

      {/* ✅ TABLEAUX */}
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {/* Top clients encaissés */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-lg font-extrabold text-slate-900">Top 10 clients encaissés ({year})</div>
          <div className="mt-1 text-xs text-slate-500">Basé sur factures PAID (TTC ou paidAmount si dispo)</div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left">Client</th>
                  <th className="px-3 py-2 text-right">Encaissé</th>
                </tr>
              </thead>
              <tbody>
                {topClientsRows.length ? (
                  topClientsRows.map((r) => (
                    <tr key={r.name} className="border-t border-slate-200">
                      <td className="px-3 py-2 text-slate-900">{r.name}</td>
                      <td className="px-3 py-2 text-right font-semibold text-slate-900">
                        {chf(r.amountCents)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-3 py-3 text-slate-500" colSpan={2}>
                      Aucun encaissement (PAID) sur {year}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top dépenses par catégorie */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-lg font-extrabold text-slate-900">Top dépenses par catégorie ({year})</div>
          <div className="mt-1 text-xs text-slate-500">Basé sur dépenses (TTC) de l’année</div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left">Catégorie</th>
                  <th className="px-3 py-2 text-right">Total TTC</th>
                  <th className="px-3 py-2 text-right">TVA</th>
                </tr>
              </thead>
              <tbody>
                {topExpensesByCategory.length ? (
                  topExpensesByCategory.map((x) => (
                    <tr key={x.category} className="border-t border-slate-200">
                      <td className="px-3 py-2 text-slate-900">{String(x.category)}</td>
                      <td className="px-3 py-2 text-right font-semibold text-slate-900">
                        {chf(x._sum.amountGrossCents ?? 0)}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-900">
                        {chf(x._sum.amountVatCents ?? 0)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-3 py-3 text-slate-500" colSpan={3}>
                      Aucune dépense sur {year}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3 text-xs text-slate-500">
            Astuce : si tu veux afficher des noms “jolis”, on peut faire un mapping (ex: CARBURANT → Carburant).
          </div>
        </div>
      </div>
    </div>
  );
}
