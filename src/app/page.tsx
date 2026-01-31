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

  // Toutes les factures de l’année (hors annulées)
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
      paidAmountCents: true, // si paiement avec escompte / montant perso
    },
  });

  const totalFactureCents = invoices.reduce((s, inv) => s + inv.amountGrossCents, 0);

  const totalTvaFactureeCents = invoices.reduce((s, inv) => s + inv.amountVatCents, 0);

  const openInvoices = invoices.filter((i) => i.status === "OPEN");
  const paidInvoices = invoices.filter((i) => i.status === "PAID");

  // A encaisser = factures OPEN TTC
  const totalAEncaisserCents = openInvoices.reduce((s, inv) => s + inv.amountGrossCents, 0);

  // Encaissé = factures PAID (on prend paidAmountCents si présent, sinon TTC)
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

  // TVA nette (simple)
  const tvaNetteCents = totalTvaFactureeCents - totalTvaPayeeCents;

  // =========================
  // UI
  // =========================
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

      {/* ✅ VITRINES "Résumé temps réel" */}
      <div className="mt-6 grid gap-3 md:grid-cols-4">
        {/* FACTURÉ */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-600">FACTURÉ (TTC) {year}</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">{chf(totalFactureCents)}</div>
          <div className="mt-2 text-xs text-slate-500">TVA facturée : {chf(totalTvaFactureeCents)}</div>
        </div>

        {/* A ENCAISSER */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-600">À ENCAISSER (OPEN)</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">{chf(totalAEncaisserCents)}</div>
          <div className="mt-2 text-xs text-slate-500">
            En retard : {chf(retardCents)} · {nbRetard} facture(s)
          </div>
        </div>

        {/* ENCAISSÉ */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-600">ENCAISSÉ (PAID)</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">{chf(totalEncaisseCents)}</div>
          <div className="mt-2 text-xs text-slate-500">
            (Prend en compte escompte si `paidAmountCents` existe)
          </div>
        </div>

        {/* DÉPENSÉ */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-600">DÉPENSÉ (TTC)</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">{chf(totalDepenseCents)}</div>
          <div className="mt-2 text-xs text-slate-500">TVA payée : {chf(totalTvaPayeeCents)}</div>
        </div>
      </div>

      {/* ✅ PETIT BLOC TVA */}
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

        {/* ✅ FACTURES EN RETARD */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-600">FACTURES EN RETARD</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">{nbRetard}</div>
          <div className="mt-2 text-xs text-slate-500">Jours max : {joursMax}</div>
        </div>
      </div>

      {/* Ici tu peux garder tes tableaux Top 10 existants
         Si tu veux, je te fais aussi les 2 tableaux "Top clients payés" et "Top dépenses" */}
    </div>
  );
}
