"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const CATS = ["DIVERS", "RESTAURANT", "CARBURANT", "PARKING", "MATERIEL"];

export default function ExpensesClient({
  year,
  category,
  q,
}: {
  year: number;
  category: string;
  q: string;
}) {
  const router = useRouter();
  const [y, setY] = useState(String(year));
  const [cat, setCat] = useState(category === "ALL" ? "ALL" : category);
  const [query, setQuery] = useState(q);

  const [date, setDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [vendor, setVendor] = useState("");
  const [tva, setTva] = useState("8.1");
  const [amountTtc, setAmountTtc] = useState("");
  const [notes, setNotes] = useState("");
  const [catNew, setCatNew] = useState("DIVERS");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const years = useMemo(() => {
    const base = new Date().getFullYear();
    return [base - 1, base, base + 1, base + 2].map(String);
  }, []);

  async function applyFilters() {
    const params = new URLSearchParams();
    params.set("year", y);
    if (cat && cat !== "ALL") params.set("category", cat);
    if (query.trim()) params.set("q", query.trim());
    router.push(`/expenses?${params.toString()}`);
  }

  async function submit() {
    try {
      setLoading(true);

      const grossCents = Math.round(Number(amountTtc.replace(",", ".")) * 100);
      const payload = {
        date,
        vendor,
        category: catNew,
        vatRate: Number(tva.replace(",", ".")),
        amountGrossCents: grossCents,
        notes: notes || null,
      };

      const res = await fetch("/api/expenses/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Erreur création dépense");

      const expenseId = json?.expense?.id;
      if (!expenseId) throw new Error("expenseId manquant (réponse create)");

      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("expenseId", expenseId);

        const up = await fetch("/api/expenses/upload", { method: "POST", body: fd });
        const upj = await up.json().catch(() => ({}));
        if (!up.ok) throw new Error(upj.error || "Erreur upload justificatif");
      }

      setVendor("");
      setAmountTtc("");
      setNotes("");
      setFile(null);

      router.refresh();
    } catch (e: any) {
      alert(e?.message || "Erreur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Filtres */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900">Filtres</h3>

        <div className="mt-4 grid gap-3">
          <label className="text-xs text-slate-600">
            Année
            <select
              value={y}
              onChange={(e) => setY(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
            >
              {years.map((yy) => (
                <option key={yy} value={yy}>
                  {yy}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs text-slate-600">
            Catégorie
            <select
              value={cat}
              onChange={(e) => setCat(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
            >
              <option value="ALL">Toutes</option>
              {CATS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs text-slate-600">
            Recherche (libellé)
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ex: repas, parking, essence…"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
            />
          </label>

          <button
            onClick={applyFilters}
            className="mt-2 rounded-2xl bg-blue-700 px-4 py-2.5 font-semibold text-white hover:bg-blue-800"
          >
            Appliquer
          </button>
        </div>
      </div>

      {/* Ajout */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900">Ajouter une dépense</h3>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="text-xs text-slate-600">
            Date
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
            />
          </label>

          <label className="text-xs text-slate-600">
            Catégorie
            <select
              value={catNew}
              onChange={(e) => setCatNew(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
            >
              {CATS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs text-slate-600">
            TVA %
            <input
              value={tva}
              onChange={(e) => setTva(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
            />
          </label>

          <label className="text-xs text-slate-600">
            Montant TTC (CHF)
            <input
              value={amountTtc}
              onChange={(e) => setAmountTtc(e.target.value)}
              placeholder="ex: 45.50"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
            />
          </label>

          <label className="text-xs text-slate-600 md:col-span-2">
            Libellé
            <input
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              placeholder="ex: Restaurant équipe / Parking / Coop"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
            />
          </label>

          <label className="text-xs text-slate-600 md:col-span-2">
            Notes (optionnel)
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ex: client présent / chantier X"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
            />
          </label>

          <label className="text-xs text-slate-600 md:col-span-2">
            Justificatif (PDF / photo)
            <input
              type="file"
              accept="application/pdf,image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
            />
          </label>

          <button
            disabled={loading}
            onClick={submit}
            className="md:col-span-2 mt-2 rounded-2xl bg-blue-700 px-4 py-2.5 font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
          >
            {loading ? "En cours…" : "Ajouter"}
          </button>
        </div>
      </div>
    </div>
  );
}
