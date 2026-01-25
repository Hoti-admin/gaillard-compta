import { prisma } from "@/lib/prisma";
import Link from "next/link";
import InvoiceStatusBadge from "@/components/InvoiceStatusBadge";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, any>;
};

function chf(cents: number) {
  return (cents / 100).toFixed(2);
}

function toStr(v: any) {
  if (Array.isArray(v)) return v[0] ?? "";
  return v ?? "";
}

export default async function InvoicesPage(props: PageProps) {
  const sp = await Promise.resolve(props.searchParams ?? {});
  const q = String(toStr(sp.q)).trim();
  const status = String(toStr(sp.status)).trim(); // OPEN / PARTIAL / PAID
  const overdue = String(toStr(sp.overdue)).trim(); // "1" = en retard
  const yearStr = String(toStr(sp.year)).trim();

  const now = new Date();
  const currentYear = now.getFullYear();
  const year = Number.isFinite(Number(yearStr)) && yearStr ? Number(yearStr) : currentYear;

  const from = new Date(Date.UTC(year, 0, 1, 0, 0, 0));
  const to = new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0));

  const where: any = {
    issueDate: { gte: from, lt: to },
  };

  if (status && ["OPEN", "PARTIAL", "PAID"].includes(status.toUpperCase())) {
    where.status = status.toUpperCase();
  }

  // Retard = dueDate < aujourd'hui ET pas payé
  if (overdue === "1") {
    where.dueDate = { lt: now };
    where.status = { not: "PAID" };
  }

  // Recherche client / numéro facture
  if (q) {
    where.OR = [
      { number: { contains: q, mode: "insensitive" } },
      { client: { name: { contains: q, mode: "insensitive" } } },
      { client: { email: { contains: q, mode: "insensitive" } } },
    ];
  }

  const invoices = await prisma.invoice.findMany({
    where,
    orderBy: [{ dueDate: "asc" }],
    include: { client: true, payments: true },
  });

  const years = [currentYear - 1, currentYear, currentYear + 1];

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Factures</h1>
          <p className="text-sm text-slate-600">
            Filtrer par année, statut, retards, recherche client / numéro.
          </p>
        </div>

        <Link
          href="/"
          className="w-fit rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          ← Dashboard
        </Link>
      </div>

      {/* Filtres (GET) */}
      <form
        method="GET"
        className="mt-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Recherche</label>
            <input
              name="q"
              defaultValue={q}
              placeholder="Client ou N° facture…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-slate-300"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Année</label>
            <select
              name="year"
              defaultValue={String(year)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-slate-300"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Statut</label>
            <select
              name="status"
              defaultValue={status}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-slate-300"
            >
              <option value="">Tous</option>
              <option value="OPEN">OUVERT</option>
              <option value="PARTIAL">PARTIEL</option>
              <option value="PAID">PAYÉ</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Retard</label>
            <select
              name="overdue"
              defaultValue={overdue}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-slate-300"
            >
              <option value="">Tout</option>
              <option value="1">Uniquement en retard</option>
            </select>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="submit"
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-extrabold text-white hover:bg-slate-800"
          >
            Appliquer
          </button>

          <Link
            href="/invoices"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            Réinitialiser
          </Link>

          <div className="ml-auto text-xs text-slate-500">
            {invoices.length} facture(s)
          </div>
        </div>
      </form>

      {/* Table */}
      <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-2">N°</th>
                <th className="py-2">Client</th>
                <th className="py-2">Statut</th>
                <th className="py-2">Échéance</th>
                <th className="py-2 text-right">TTC</th>
                <th className="py-2 text-right">Payé</th>
                <th className="py-2 text-right">Solde</th>
              </tr>
            </thead>

            <tbody>
              {invoices.map((inv) => {
                const paidCents = inv.payments.reduce((s, p) => s + (p.amountCents ?? 0), 0);
                const totalCents = inv.amountGrossCents ?? 0;
                const balanceCents = Math.max(0, totalCents - paidCents);

                const isLate =
                  inv.status !== "PAID" && inv.dueDate && new Date(inv.dueDate).getTime() < now.getTime();

                return (
                  <tr key={inv.id} className="border-t border-slate-100">
                    <td className="py-3 font-extrabold text-slate-900">{inv.number}</td>

                    <td className="py-3 text-slate-900">
                      <div className="font-bold">{inv.client?.name ?? "—"}</div>
                      {inv.client?.id ? (
                        <Link
                          className="text-xs text-slate-500 underline hover:no-underline"
                          href={`/clients/${inv.client.id}`}
                        >
                          Ouvrir client
                        </Link>
                      ) : null}
                      {isLate ? (
                        <div className="mt-1 text-[11px] font-extrabold text-rose-700">EN RETARD</div>
                      ) : null}
                    </td>

                    <td className="py-3">
                      <InvoiceStatusBadge status={inv.status} />
                    </td>

                    <td className="py-3 text-slate-600">
                      {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "—"}
                    </td>

                    <td className="py-3 text-right font-semibold text-slate-900">
                      {chf(totalCents)} CHF
                    </td>

                    <td className="py-3 text-right text-slate-900">
                      {chf(paidCents)} CHF
                    </td>

                    <td className="py-3 text-right font-extrabold">
                      <span className={balanceCents > 0 ? "text-rose-700" : "text-emerald-700"}>
                        {chf(balanceCents)} CHF
                      </span>
                    </td>
                  </tr>
                );
              })}

              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-500">
                    Aucune facture pour ces filtres.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
