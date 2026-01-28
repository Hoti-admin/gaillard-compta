import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { createClient } from "@/app/actions";
import { PageTitle, Card, Badge } from "@/components/ui";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, any>;
};

function toStr(v: any) {
  if (Array.isArray(v)) return v[0] ?? "";
  return v ?? "";
}

export default async function ClientsPage(props: PageProps) {
  const sp = await Promise.resolve(props.searchParams ?? {});
  const q = String(toStr(sp.q)).trim();

  const clients = await prisma.client.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { name: "asc" },
    include: { invoices: true },
  });

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <PageTitle title="Clients" subtitle="Création + recherche + accès rapide." />
        </div>

        <Link
          href="/"
          className="w-fit rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          ← Dashboard
        </Link>
      </div>

      {/* Barre recherche */}
      <form method="GET" className="mt-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-bold text-slate-600">Recherche</label>
            <input
              name="q"
              defaultValue={q}
              placeholder="Nom, email, téléphone…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-slate-300"
            />
          </div>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-extrabold text-white hover:bg-slate-800"
            >
              Rechercher
            </button>

            <Link
              href="/clients"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-center text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Reset
            </Link>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
          {q ? <Badge tone="neutral">Filtre: “{q}”</Badge> : null}
          <span className="ml-auto">{clients.length} client(s)</span>
        </div>
      </form>

      {/* Créer client */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Nouveau client" className="lg:col-span-1">
          
  <p className="text-sm text-muted-foreground">
    Ajoute un client (nom obligatoire).
  </p>
          <form action={createClient} className="mt-3 grid gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Nom *</label>
              <input
                name="name"
                required
                placeholder="Ex: PPE Musy 26/28"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-slate-300"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Email</label>
              <input
                name="email"
                placeholder="email@…"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-slate-300"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Téléphone</label>
              <input
                name="phone"
                placeholder="079 …"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-slate-300"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Adresse</label>
              <input
                name="address"
                placeholder="Rue, NPA, ville…"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-slate-300"
              />
            </div>

            <button
              type="submit"
              className="mt-1 rounded-xl bg-slate-900 px-4 py-2 text-sm font-extrabold text-white hover:bg-slate-800"
            >
              + Créer le client
            </button>
          </form>
        </Card>

        {/* Liste */}
        <div className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Liste</h2>
            <span className="text-xs text-slate-500">Clique pour ouvrir le détail</span>
          </div>

          {clients.length === 0 ? (
            <p className="text-sm text-slate-600">Aucun client.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {clients.map((c) => (
                <Link
                  key={c.id}
                  href={`/clients/${c.id}`}
                  className="flex items-center justify-between gap-3 py-3 hover:bg-slate-50/60 rounded-2xl px-2"
                >
                  <div>
                    <div className="font-extrabold text-slate-900">{c.name}</div>
                    <div className="text-xs text-slate-600">
                      {c.email ?? "—"} · {c.phone ?? "—"}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge tone="neutral">{c.invoices.length} fact.</Badge>
                    <span className="text-slate-400">→</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
