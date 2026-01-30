import { prisma } from "@/lib/prisma";
import PayInvoiceButton from "./PayInvoiceButton";

function chfFromCents(cents: number) {
  return (cents / 100).toFixed(2);
}

export default async function InvoicesPage() {
  const invoices = await prisma.invoice.findMany({
    orderBy: [{ createdAt: "desc" }],
    include: {
      client: true, // si tu as la relation client
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="text-2xl font-extrabold tracking-tight text-slate-900">Factures</div>
      <div className="mt-2 text-sm text-slate-600">
        Marquer une facture comme payée (plein montant / escompte / montant manuel)
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-600">
            <tr>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">N°</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3 text-right">Total TTC</th>
              <th className="px-4 py-3 text-right">Payé</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>

          <tbody>
            {invoices.map((inv) => {
              const isPaid = inv.status === "PAID";
              const paid = inv.paidAmountCents ?? 0;

              return (
                <tr key={inv.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">
                      {inv.client?.name ?? "—"}
                    </div>
                  </td>

                  <td className="px-4 py-3">{inv.number ?? "—"}</td>

                  <td className="px-4 py-3">
                    <span
                      className={[
                        "inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold",
                        isPaid ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700",
                      ].join(" ")}
                    >
                      {isPaid ? "PAYÉ" : "OUVERT"}
                    </span>

                    {isPaid && inv.discountRateBp ? (
                      <div className="mt-1 text-xs text-slate-500">
                        Escompte {(inv.discountRateBp / 100).toFixed(2)}% (CHF{" "}
                        {inv.discountCents ? chfFromCents(inv.discountCents) : "0.00"})
                      </div>
                    ) : null}
                  </td>

                  <td className="px-4 py-3 text-right font-semibold">
                    CHF {chfFromCents(inv.amountGrossCents)}
                  </td>

                  <td className="px-4 py-3 text-right">
                    {isPaid ? (
                      <span className="font-semibold text-slate-900">
                        CHF {chfFromCents(paid)}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    {isPaid ? (
                      <span className="text-xs text-slate-400">Déjà payé</span>
                    ) : (
                      <PayInvoiceButton invoiceId={inv.id} />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {invoices.length === 0 ? (
          <div className="p-6 text-sm text-slate-600">Aucune facture.</div>
        ) : null}
      </div>
    </div>
  );
}
