import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

function chf(cents: number) {
  return `CHF ${(cents / 100).toFixed(2)}`;
}

export default async function ClientDetailPage(props: { params: Promise<{ id: string }> }) {
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
    },
  });

  if (!client) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-lg font-extrabold text-slate-900">Client introuvable</div>
          <div className="mt-2">
            <Link
              href="/clients"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
            >
              Retour
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const invoices = await prisma.invoice.findMany({
    where: { clientId: id, status: { not: "CANCELED" } },
    orderBy: [{ number: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      number: true,
      status: true,
      issueDate: true,
      dueDate: true,
      amountGrossCents: true,
      paidAmountCents: true,
      paidAt: true,
      projectName: true,
    },
  });

  const totalFacture = invoices.reduce((s, i) => s + i.amountGrossCents, 0);
  const totalEncaisse = invoices
    .filter((i) => i.status === "PAID")
    .reduce((s, i) => s + (i.paidAmountCents ?? i.amountGrossCents), 0);
  const totalOuvert = invoices
    .filter((i) => i.status === "OPEN")
    .reduce((s, i) => s + i.amountGrossCents, 0);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-3xl font-extrabold tracking-tight text-slate-900">
            {client.name}
          </div>
          <div className="mt-1 text-sm text-slate-600">Fiche client &amp; historique factures</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/clients"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
          >
            Retour clients
          </Link>

          <Link
            href={`/invoices/create?clientId=${client.id}`}
            className="rounded-2xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
          >
            + Créer une facture
          </Link>
        </div>
      </div>

      {/* Infos client */}
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:col-span-2">
          <div className="text-lg font-extrabold text-slate-900">Informations</div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold text-slate-600">Contact</div>
              <div className="mt-1 text-sm text-slate-900">
                {client.email ? <div>{client.email}</div> : <div className="text-slate-400">—</div>}
                {client.phone ? <div>{client.phone}</div> : null}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold text-slate-600">Adresse</div>
              <div className="mt-1 text-sm text-slate-900">
                {client.address ? client.address : <span className="text-slate-400">—</span>}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-600">Statistiques</div>
          <div className="mt-3 grid gap-2">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs text-slate-600">Total facturé</div>
              <div className="text-lg font-extrabold text-slate-900">{chf(totalFacture)}</div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs text-slate-600">Encaissé</div>
              <div className="text-lg font-extrabold text-emerald-900">{chf(totalEncaisse)}</div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs text-slate-600">À encaisser (OPEN)</div>
              <div className="text-lg font-extrabold text-amber-900">{chf(totalOuvert)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Factures client */}
      <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-lg font-extrabold text-slate-900">Factures</div>
          <div className="text-xs text-slate-500">Tri: numéro décroissant (dernier en premier)</div>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-xs text-slate-600">
              <tr className="border-b">
                <th className="py-2 text-left">N°</th>
                <th className="py-2 text-left">Projet</th>
                <th className="py-2 text-left">Date</th>
                <th className="py-2 text-left">Échéance</th>
                <th className="py-2 text-left">Statut</th>
                <th className="py-2 text-right">TTC</th>
                <th className="py-2 text-right">Payé</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-4 text-slate-600">
                    Aucune facture pour ce client.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="border-b last:border-b-0">
                    <td className="py-2 font-semibold text-slate-900">{inv.number}</td>
                    <td className="py-2 text-slate-700">
                      {inv.projectName ?? <span className="text-slate-400">—</span>}
                    </td>
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
