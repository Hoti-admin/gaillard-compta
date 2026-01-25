import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import InvoiceCreateForm from "@/components/InvoiceCreateForm";
import InvoiceStatusBadge from "@/components/InvoiceStatusBadge";

type PageProps = {
  params: Promise<{ id: string }> | { id: string };
};

function chf(cents: number) {
  return (cents / 100).toFixed(2);
}

export default async function ClientDetail(props: PageProps) {
  const params = await Promise.resolve(props.params);
  const id = params?.id;
  if (!id) return notFound();

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      invoices: {
        include: { payments: true },
        orderBy: { dueDate: "asc" },
      },
    },
  });

  if (!client) return notFound();

  const now = new Date();

  const totalCents = client.invoices.reduce((s, inv) => s + (inv.amountGrossCents ?? 0), 0);
  const paidCents = client.invoices.reduce(
    (s, inv) => s + inv.payments.reduce((ss, p) => ss + (p.amountCents ?? 0), 0),
    0
  );
  const balanceCents = Math.max(0, totalCents - paidCents);

  const lateCount = client.invoices.filter(
    (inv) => inv.status !== "PAID" && inv.dueDate && new Date(inv.dueDate).getTime() < now.getTime()
  ).length;

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">{client.name}</h1>
          <p className="text-sm text-slate-600">
            {client.email ? client.email : "—"} · {client.phone ? client.phone : "—"}
          </p>
        </div>

        <Link
          href="/clients"
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          ← Retour clients
        </Link>
      </div>

      {/* Résumé fiduciaire */}
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-bold text-slate-500">TOTAL FACTURÉ</div>
          <div className="mt-1 text-xl font-extrabold text-slate-900">{chf(totalCents)} CHF</div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-bold text-slate-500">TOTAL PAYÉ</div>
          <div className="mt-1 text-xl font-extrabold text-emerald-700">{chf(paidCents)} CHF</div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-bold text-slate-500">SOLDE OUVERT</div>
          <div className="mt-1 text-xl font-extrabold text-rose-700">{chf(balanceCents)} CHF</div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-bold text-slate-500">FACTURES EN RETARD</div>
          <div className="mt-1 text-xl font-extrabold text-slate-900">{lateCount}</div>
        </div>
      </div>

      {/* Formulaire (Client Component) */}
      <InvoiceCreateForm clientId={client.id} />

      {/* Liste factures */}
      <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Factures</h2>
          <span className="text-xs text-slate-500">{client.invoices.length} facture(s)</span>
        </div>

        {client.invoices.length === 0 ? (
          <p className="text-sm text-slate-600">Aucune facture pour ce client.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-2">N°</th>
                  <th className="py-2">Statut</th>
                  <th className="py-2">Date</th>
                  <th className="py-2">Échéance</th>
                  <th className="py-2 text-right">TTC</th>
                  <th className="py-2 text-right">Payé</th>
                  <th className="py-2 text-right">Solde</th>
                </tr>
              </thead>

              <tbody>
                {client.invoices.map((inv) => {
                  const paid = inv.payments.reduce((s, p) => s + (p.amountCents ?? 0), 0);
                  const total = inv.amountGrossCents ?? 0;
                  const balance = Math.max(0, total - paid);

                  const isLate =
                    inv.status !== "PAID" &&
                    inv.dueDate &&
                    new Date(inv.dueDate).getTime() < now.getTime();

                  return (
                    <tr key={inv.id} className="border-t border-slate-100">
                      <td className="py-3 font-extrabold text-slate-900">
                        {inv.number}
                        {isLate ? (
                          <div className="mt-1 text-[11px] font-extrabold text-rose-700">EN RETARD</div>
                        ) : null}
                      </td>

                      <td className="py-3">
                        <InvoiceStatusBadge status={inv.status} />
                      </td>

                      <td className="py-3 text-slate-600">
                        {inv.issueDate ? new Date(inv.issueDate).toLocaleDateString() : "—"}
                      </td>

                      <td className="py-3 text-slate-600">
                        {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "—"}
                      </td>

                      <td className="py-3 text-right font-semibold text-slate-900">
                        {chf(total)} CHF
                      </td>

                      <td className="py-3 text-right text-slate-900">{chf(paid)} CHF</td>

                      <td className="py-3 text-right font-extrabold">
                        <span className={balance > 0 ? "text-rose-700" : "text-emerald-700"}>
                          {chf(balance)} CHF
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
