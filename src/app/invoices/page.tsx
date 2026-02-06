import { prisma } from "@/lib/prisma";
import Link from "next/link";
import MarkPaidButton from "./MarkPaidButton";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function chf(cents: number) {
  return `CHF ${(cents / 100).toFixed(2)}`;
}

export default async function InvoicesPage(props: { searchParams?: Promise<any> }) {
  const sp = (await props.searchParams) ?? {};
  const year = Number(sp.year ?? new Date().getFullYear());

  const yearStart = new Date(`${year}-01-01T00:00:00.000Z`);
  const yearEnd = new Date(`${year + 1}-01-01T00:00:00.000Z`);

  const invoices = await prisma.invoice.findMany({
    where: {
      issueDate: { gte: yearStart, lt: yearEnd },
      status: { not: "CANCELED" },
    },
    // ✅ Tri demandé: 2025001, 2025002... du haut vers le bas
    orderBy: [{ number: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      number: true,
      status: true,
      issueDate: true,
      dueDate: true,
      amountGrossCents: true,
      amountNetCents: true,
      amountVatCents: true,
      paidAt: true,
      paidAmountCents: true,
      discountRateBp: true,
      discountCents: true,
      projectName: true,
      client: { select: { id: true, name: true } },
    },
  });

  const totalGross = invoices.reduce((s, i) => s + i.amountGrossCents, 0);
  const totalVat = invoices.reduce((s, i) => s + i.amountVatCents, 0);

  const totalEncaisse = invoices
    .filter((i) => i.status === "PAID")
    .reduce((s, i) => s + (i.paidAmountCents ?? i.amountGrossCents), 0);

  const totalAEncaisser = invoices
    .filter((i) => i.status === "OPEN")
    .reduce((s, i) => s + i.amountGrossCents, 0);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-3xl font-extrabold tracking-tight text-slate-900">Factures</div>
          <div className="mt-1 text-sm text-slate-600">Liste &amp; suivi (année {year})</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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

          <Link
            href="/invoices/create"
            className="rounded-2xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
          >
            + Nouvelle facture
          </Link>
        </div>
      </div>

      {/* vitrines */}
      <div className="mt-6 grid gap-3 md:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-600">FACTURÉ (TTC)</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">{chf(totalGross)}</div>
          <div className="mt-2 text-xs text-slate-500">TVA facturée : {chf(totalVat)}</div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-600">À ENCAISSER (OPEN)</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">{chf(totalAEncaisser)}</div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-600">ENCAISSÉ (PAID)</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">{chf(totalEncaisse)}</div>
          <div className="mt-2 text-xs text-slate-500">(avec escompte si payé)</div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-600">NB FACTURES</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">{invoices.length}</div>
        </div>
      </div>

      {/* table */}
      <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="text-lg font-extrabold text-slate-900">Liste des factures ({year})</div>

        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-xs text-slate-600">
              <tr className="border-b">
                <th className="py-2 text-left">N°</th>
                <th className="py-2 text-left">Client</th>
                <th className="py-2 text-left">Projet</th>
                <th className="py-2 text-left">Date</th>
                <th className="py-2 text-left">Échéance</th>
                <th className="py-2 text-left">Statut</th>
                <th className="py-2 text-right">TTC</th>
                <th className="py-2 text-right">Payé</th>
                <th className="py-2 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-4 text-slate-600">
                    Aucune facture pour {year}.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="border-b last:border-b-0">
                    <td className="py-2 font-semibold text-slate-900">{inv.number}</td>
                    <td className="py-2">{inv.client?.name ?? "-"}</td>
                    <td className="py-2 text-slate-700">{inv.projectName ?? <span className="text-slate-400">—</span>}</td>
                    <td className="py-2">{new Date(inv.issueDate).toLocaleDateString()}</td>
                    <td className="py-2">{new Date(inv.dueDate).toLocaleDateString()}</td>

                    <td className="py-2">
                      <span
                        className={[
                          "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold",
                          inv.status === "PAID"
                            ? "bg-emerald-50 text-emerald-800"
                            : inv.status === "OPEN"
                            ? "bg-amber-50 text-amber-800"
                            : "bg-slate-100 text-slate-700",
                        ].join(" ")}
                      >
                        {inv.status}
                      </span>
                    </td>

                    <td className="py-2 text-right font-semibold text-slate-900">
                      {chf(inv.amountGrossCents)}
                    </td>

                    <td className="py-2 text-right">
                      {inv.status === "PAID"
                        ? chf(inv.paidAmountCents ?? inv.amountGrossCents)
                        : "-"}
                    </td>

                    <td className="py-2 text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/clients/${inv.client?.id ?? ""}`}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-slate-50"
                        >
                          Client
                        </Link>

                        {inv.status === "OPEN" ? (
                          <MarkPaidButton
                            invoiceId={inv.id}
                            invoiceNumber={inv.number}
                            grossCents={inv.amountGrossCents}
                          />
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 text-xs text-slate-500">
          * Tri par numéro de facture croissant (2025001 → 2025002 → …).
        </div>
      </div>
    </div>
  );
}
