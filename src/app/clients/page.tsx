import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

function chf(cents: number) {
  return `${(cents / 100).toFixed(2)} CHF`;
}

export default async function ClientsPage() {
  const clients = await prisma.client.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      address: true,
      createdAt: true,
    },
  });

  const clientIds = clients.map((c) => c.id);

  const invAgg = clientIds.length
    ? await prisma.invoice.groupBy({
        by: ["clientId"],
        where: { clientId: { in: clientIds }, status: { not: "CANCELED" } },
        _count: { _all: true },
        _sum: { amountGrossCents: true },
      })
    : [];

  const byClient = new Map(
    invAgg.map((x) => [
      x.clientId,
      {
        count: x._count._all,
        sum: x._sum.amountGrossCents ?? 0,
      },
    ])
  );

  // ✅ On transforme en rows puis tri par total facturé (desc)
  const rows = clients
    .map((c) => {
      const agg = byClient.get(c.id) ?? { count: 0, sum: 0 };
      return { client: c, agg };
    })
    .sort((a, b) => b.agg.sum - a.agg.sum || a.client.name.localeCompare(b.client.name));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-3xl font-extrabold tracking-tight text-slate-900">Clients</div>
          <div className="mt-1 text-sm text-slate-600">
            Liste des clients + total facturé (hors annulées)
          </div>
        </div>

        <Link
          href="/clients/new"
          className="rounded-2xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
        >
          + Nouveau client
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
            <tr>
              <th className="px-3 py-2 text-left">Client</th>
              <th className="px-3 py-2 text-left">Contact</th>
              <th className="px-3 py-2 text-right">Nb factures</th>
              <th className="px-3 py-2 text-right">Total facturé</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {rows.length ? (
              rows.map(({ client: c, agg }) => {
                const contact = [c.email, c.phone].filter(Boolean).join(" · ");

                return (
                  <tr key={c.id} className="border-t border-slate-200">
                    <td className="px-3 py-2 font-semibold text-slate-900">
                      {c.name}
                      {c.address ? (
                        <div className="text-xs font-normal text-slate-500">{c.address}</div>
                      ) : null}
                    </td>

                    <td className="px-3 py-2 text-slate-700">
                      {contact || <span className="text-slate-400">—</span>}
                    </td>

                    <td className="px-3 py-2 text-right text-slate-900">{agg.count}</td>

                    <td className="px-3 py-2 text-right font-semibold text-slate-900">{chf(agg.sum)}</td>

                    <td className="px-3 py-2 text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/clients/${c.id}`}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-slate-50"
                        >
                          Ouvrir
                        </Link>

                        <Link
                          href={`/clients/${c.id}?edit=1`}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-slate-50"
                        >
                          Modifier
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="px-3 py-3 text-slate-500">
                  Aucun client.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 text-xs text-slate-500">
        * Tri par total facturé décroissant (puis alphabétique).
      </div>
    </div>
  );
}
