// src/app/clients/[id]/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import AddInvoiceCard from "../AddInvoiceCard";

export const dynamic = "force-dynamic";

export default async function ClientPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  const client = await prisma.client.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      address: true,
      createdAt: true,
      invoices: {
        orderBy: { issueDate: "desc" },
        select: {
          id: true,
          number: true,
          issueDate: true,
          dueDate: true,
          status: true,
          amountGrossCents: true,
          amountVatCents: true,
          projectName: true,
        },
      },
    },
  });

  if (!client) {
    return (
      <div className="p-6">
        <div className="text-lg font-bold">Client introuvable</div>
        <Link className="mt-3 inline-block text-blue-700 underline" href="/clients">
          Retour
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">{client.name}</h1>
          <div className="mt-2 text-sm text-slate-600">
            {client.email ? <div>Email : {client.email}</div> : null}
            {client.phone ? <div>Téléphone : {client.phone}</div> : null}
            {client.address ? <div>Adresse : {client.address}</div> : null}
          </div>
        </div>

        <Link
          href="/clients"
          className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
        >
          ← Clients
        </Link>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* ✅ Formulaire : ajouter une facture */}
        <AddInvoiceCard clientId={client.id} clientName={client.name} />

        {/* Liste des factures */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-lg font-extrabold text-slate-900">Factures</div>

          {client.invoices.length === 0 ? (
            <div className="mt-4 text-sm text-slate-600">Aucune facture pour ce client.</div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-slate-500">
                  <tr>
                    <th className="py-2 pr-3">N°</th>
                    <th className="py-2 pr-3">Chantier</th>
                    <th className="py-2 pr-3">Date</th>
                    <th className="py-2 pr-3">Échéance</th>
                    <th className="py-2 pr-3">TTC</th>
                    <th className="py-2 pr-3">TVA</th>
                    <th className="py-2 pr-3">Statut</th>
                  </tr>
                </thead>
                <tbody className="text-slate-800">
                  {client.invoices.map((inv) => (
                    <tr key={inv.id} className="border-t border-slate-100">
                      <td className="py-2 pr-3 font-semibold">{inv.number}</td>
                      <td className="py-2 pr-3">{inv.projectName ?? "-"}</td>
                      <td className="py-2 pr-3">
                        {new Date(inv.issueDate).toLocaleDateString("fr-CH")}
                      </td>
                      <td className="py-2 pr-3">
                        {new Date(inv.dueDate).toLocaleDateString("fr-CH")}
                      </td>
                      <td className="py-2 pr-3">
                        CHF {(inv.amountGrossCents / 100).toFixed(2)}
                      </td>
                      <td className="py-2 pr-3">
                        CHF {(inv.amountVatCents / 100).toFixed(2)}
                      </td>
                      <td className="py-2 pr-3">
                        <span
                          className={
                            inv.status === "PAID"
                              ? "rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800"
                              : inv.status === "CANCELED"
                              ? "rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700"
                              : "rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800"
                          }
                        >
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 text-xs text-slate-500">
            Astuce : sur iPhone, tu peux écrire “10&apos;695,50” ou “10695.50”, ça marche.
          </div>
        </div>
      </div>
    </div>
  );
}
