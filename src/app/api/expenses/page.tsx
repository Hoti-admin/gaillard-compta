import { prisma } from "@/lib/prisma";
import Link from "next/link";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, any>;
};

function fmtCHF(cents: number) {
  return `${(cents / 100).toFixed(2)} CHF`;
}

function isImage(path: string) {
  const p = path.toLowerCase();
  return p.endsWith(".png") || p.endsWith(".jpg") || p.endsWith(".jpeg") || p.endsWith(".webp") || p.endsWith(".gif");
}

function isPdf(path: string) {
  return path.toLowerCase().endsWith(".pdf");
}

function DocIcon({ path }: { path: string }) {
  const pdf = isPdf(path);
  const img = isImage(path);

  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
      title={pdf ? "PDF" : img ? "Image" : "Fichier"}
    >
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-100">
        {pdf ? "PDF" : img ? "IMG" : "FILE"}
      </span>
      <span className="truncate max-w-[180px]">{path.split("/").pop()}</span>
    </span>
  );
}

export default async function ExpensesPage(props: PageProps) {
  const sp = await Promise.resolve(props.searchParams ?? {});
  const now = new Date();
  const currentYear = now.getFullYear();

  const year = Number((sp as any)?.year || currentYear);
  const category = String((sp as any)?.category || "ALL");
  const q = String((sp as any)?.q || "").trim();

  const from = new Date(Date.UTC(year, 0, 1, 0, 0, 0));
  const to = new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0));

  const expenses = await prisma.expense.findMany({
    where: {
      date: { gte: from, lt: to },
      ...(category !== "ALL" ? { category: category as any } : {}),
      ...(q ? { vendor: { contains: q, mode: "insensitive" } } : {}),
    },
    orderBy: { date: "desc" },
  });

  const totalGross = expenses.reduce((s, e) => s + e.amountGrossCents, 0);
  const totalNet = expenses.reduce((s, e) => s + e.amountNetCents, 0);
  const totalVat = expenses.reduce((s, e) => s + e.amountVatCents, 0);

  const returnTo = `/expenses?year=${year}&category=${encodeURIComponent(category)}&q=${encodeURIComponent(q)}`;

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Dépenses</h1>
          <p className="text-sm text-slate-600">
            Restaurant, carburant, divers — suivi HT / TVA / TTC
          </p>
        </div>
        <Link
          href="/"
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          ← Dashboard
        </Link>
      </div>

      {/* Totaux */}
      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-semibold text-slate-600">Total HT</div>
          <div className="mt-1 text-2xl font-extrabold text-slate-900">{fmtCHF(totalNet)}</div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-semibold text-slate-600">Total TVA</div>
          <div className="mt-1 text-2xl font-extrabold text-slate-900">{fmtCHF(totalVat)}</div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-semibold text-slate-600">Total TTC</div>
          <div className="mt-1 text-2xl font-extrabold text-slate-900">{fmtCHF(totalGross)}</div>
        </div>
      </div>

      {/* Filtres + Ajout */}
      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Filtres</h2>

          <form className="mt-4 grid grid-cols-1 gap-3" action="/expenses" method="GET">
            <div>
              <label className="text-xs font-semibold text-slate-600">Année</label>
              <input
                name="year"
                defaultValue={year}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600">Catégorie</label>
              <select
                name="category"
                defaultValue={category}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="ALL">Toutes</option>
                <option value="RESTAURANT">Restaurant</option>
                <option value="FUEL">Carburant</option>
                <option value="PARKING">Parking</option>
                <option value="TOOLS">Matériel / outils</option>
                <option value="DIVERS">Divers</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600">Recherche (libellé)</label>
              <input
                name="q"
                defaultValue={q}
                placeholder="ex: repas, parking, essence..."
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </div>

            <button
              className="mt-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
              type="submit"
            >
              Appliquer
            </button>
          </form>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Ajouter une dépense</h2>

          {/* IMPORTANT: enctype pour upload */}
          <form className="mt-4 grid grid-cols-1 gap-3" action="/api/expenses/create" method="POST" encType="multipart/form-data">
            <input type="hidden" name="returnTo" value={returnTo} />

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-slate-600">Date</label>
                <input
                  name="date"
                  type="date"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">Catégorie</label>
                <select
                  name="category"
                  defaultValue="DIVERS"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="RESTAURANT">Restaurant</option>
                  <option value="FUEL">Carburant</option>
                  <option value="PARKING">Parking</option>
                  <option value="TOOLS">Matériel / outils</option>
                  <option value="DIVERS">Divers</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-slate-600">TVA %</label>
                <input
                  name="vatRate"
                  defaultValue="8.1"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">Montant TTC (CHF)</label>
                <input
                  name="amountTtc"
                  placeholder="ex: 45.50"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600">Libellé</label>
              <input
                name="vendor"
                placeholder="ex: Restaurant équipe / Parking / Coop"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600">Notes (optionnel)</label>
              <input
                name="notes"
                placeholder="ex: client présent / chantier X"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600">Justificatif (PDF / photo)</label>
              <input
                name="file"
                type="file"
                accept="application/pdf,image/*"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              />
              <p className="mt-1 text-xs text-slate-500">
                Si tu choisis un fichier → il est envoyé dans Supabase Storage (bucket <b>expenses</b>).
              </p>
            </div>

            <button className="mt-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800">
              Ajouter
            </button>
          </form>
        </div>
      </div>

      {/* LISTE */}
      <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-3">Liste</h2>

        {expenses.length === 0 ? (
          <p className="text-sm text-slate-600">Aucune dépense.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-2">Date</th>
                  <th className="py-2">Catégorie</th>
                  <th className="py-2">Libellé</th>
                  <th className="py-2 text-right">HT</th>
                  <th className="py-2 text-right">TVA</th>
                  <th className="py-2 text-right">TTC</th>
                  <th className="py-2">Justificatif</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>

              <tbody>
                {expenses.map((e) => {
                  const dateStr = new Date(e.date).toLocaleDateString("fr-CH");

                  return (
                    <tr key={e.id} className="border-t border-slate-100">
                      <td className="py-2 text-slate-700">{dateStr}</td>
                      <td className="py-2 text-slate-600">{String(e.category)}</td>
                      <td className="py-2 font-semibold text-slate-900">{e.vendor}</td>
                      <td className="py-2 text-right text-slate-900">{fmtCHF(e.amountNetCents)}</td>
                      <td className="py-2 text-right text-slate-900">{fmtCHF(e.amountVatCents)}</td>
                      <td className="py-2 text-right font-bold text-slate-900">{fmtCHF(e.amountGrossCents)}</td>

                      <td className="py-2">
                        {e.receiptPath ? (
                          <div className="flex items-center gap-2">
                            <DocIcon path={e.receiptPath} />
                            <a
                              className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50"
                              href={`/api/expenses/file?path=${encodeURIComponent(e.receiptPath)}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Ouvrir
                            </a>
                            <a
                              className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50"
                              href={`/api/expenses/file?path=${encodeURIComponent(e.receiptPath)}&download=1`}
                            >
                              Télécharger
                            </a>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-2 text-right">
                        <form action="/api/expenses/delete" method="POST" className="inline">
                          <input type="hidden" name="expenseId" value={e.id} />
                          <input type="hidden" name="returnTo" value={returnTo} />
                          <button
                            className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100"
                            type="submit"
                          >
                            Supprimer
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-10 text-xs text-slate-400">
        Version Pro (MVP) · Données en CHF · © {year} GAILLARD Jean-Paul SA
      </div>
    </div>
  );
}
