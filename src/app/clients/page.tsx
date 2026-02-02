// src/app/clients/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import AddInvoiceCard from "./AddInvoiceCard";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const clients = await prisma.client.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      invoices: {
        orderBy: { issueDate: "desc" },
        take: 3,
        select: {
          id: true,
          number: true,
          status: true,
          amountGrossCents: true,
          issueDate: true,
          projectName: true,
        },
      },
    },
  });

  // ⚠️ Dans cette version, on affiche le formulaire pour le 1er client.
  // (Sinon il faut un select client côté client component.)
  const first = clients[0] ?? null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-slate-900">Clients</h1>
        <Link
          href="/"
          className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
        >
          ← Dashboard
        </Link>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* ✅ Ajout facture */}
        <div>
          {first ? (
            <AddInvoiceCard clientId={first.id} clientName={first.name} />
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-lg font-extrabold text-slate-900">Ajouter une facture</div>
              <div className="mt-2 text-sm text-slate-600">Aucun client pour l’instant.</div>
            </div>
          )}

          <div className="mt-3 text-xs text-slate-500">
            Si tu veux choisir le client avant d’ajouter la facture, dis-moi et je te fais un
            select déroulant (mobile friendly).
          </div>
        </div>

        {/* ✅ Liste clients */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-lg font-extrabold text-slate-900">Liste des clients</div>

          {clients.length === 0 ? (
            <div className="mt-4 text-sm text-slate-600">Aucun client.</div>
          ) : (
            <div className="mt-4 grid gap-3">
              {clients.map((c) => (
                <div key={c.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-900">{c.name}</div>
                      <div className="mt-1 text-xs text-slate-600">
                        {c.email ? <span>{c.email}</span> : null}
                        {c.email && c.phone ? <span> • </span> : null}
                        {c.phone ? <span>{c.phone}</span> : null}
                      </div>
                    </div>

                    {/* Si tu as /clients/[id] */}
                    <Link
                      className="text-sm font-semibold text-blue-700 underline"
                      href={`/clients/${c.id}`}
                    >
                      Ouvrir
                    </Link>
                  </div>

                  {c.invoices.length > 0 ? (
                    <div className="mt-3 text-xs text-slate-600">
                      Dernières factures :
                      <ul className="mt-1 list-disc pl-5">
                        {c.invoices.map((inv) => (
                          <li key={inv.id}>
                            {inv.number} — CHF {(inv.amountGrossCents / 100).toFixed(2)} —{" "}
                            {inv.status}
                            {inv.projectName ? ` — ${inv.projectName}` : ""}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="mt-3 text-xs text-slate-500">Aucune facture.</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
