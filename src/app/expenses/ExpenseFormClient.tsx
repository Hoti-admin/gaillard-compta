"use client";

import { useState } from "react";
import { createExpense, updateExpense } from "./actions";

type Mode = "create" | "edit";

const CATEGORY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "RESTAURANT", label: "Restaurant" },
  { value: "CARBURANT", label: "Carburant" },
  { value: "PARKING", label: "Parking" },
  { value: "FOURNITURES", label: "Fournitures" },
  { value: "OUTILLAGE", label: "Outillage" },
  { value: "TELEPHONE", label: "Téléphone" },
  { value: "INTERNET", label: "Internet" },
  { value: "TRANSPORT", label: "Transport" },

  // ✅ Ajouts
  { value: "LOYER_DEPOT", label: "Loyer / Dépôt" },
  { value: "ASSURANCE_MALADIE", label: "Assurance maladie" },
  { value: "ASSURANCE_LPP", label: "Assurance LPP" },
  { value: "SALAIRE_EMPLOYES", label: "Salaires employés" },
  { value: "SALAIRE_CADRES", label: "Salaires cadres" },
  { value: "GARAGE_REPARATIONS", label: "Garage / réparations véhicules" },
  { value: "ASSURANCE_VEHICULE", label: "Assurance véhicule" },

  { value: "DIVERS", label: "Divers" },
];

function parseMoneyToCents(raw: string) {
  const cleaned = raw.trim().replace(/['\s]/g, "").replace(",", ".");
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return NaN;
  return Math.round(n * 100);
}

function parseVatRateToBp(raw: string) {
  // "8.1" => 810
  const cleaned = raw.trim().replace(",", ".");
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return NaN;
  return Math.round(n * 100);
}

export default function ExpenseFormClient(props: {
  mode: Mode;
  expense?: any; // si mode=edit, tu passes l'objet expense
}) {
  const exp = props.expense;

  const [date, setDate] = useState(() => {
    if (exp?.date) {
      const d = new Date(exp.date);
      return d.toISOString().slice(0, 10);
    }
    return new Date().toISOString().slice(0, 10);
  });

  const [vendor, setVendor] = useState(exp?.vendor ?? "");
  const [category, setCategory] = useState(exp?.category ?? "RESTAURANT");
  const [ttc, setTtc] = useState(exp ? String((exp.amountGrossCents / 100).toFixed(2)) : "");
  const [vatPct, setVatPct] = useState(exp ? String((exp.vatRateBp / 100).toFixed(1)) : "8.1"); // ✅ défaut 8.1%
  const [notes, setNotes] = useState(exp?.notes ?? "");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit() {
    setLoading(true);
    setMsg(null);

    const amountGrossCents = parseMoneyToCents(ttc);
    if (!Number.isFinite(amountGrossCents)) {
      setMsg("Montant TTC invalide (ex: 25.00 ou 25,00).");
      setLoading(false);
      return;
    }

    const vatRateBp = parseVatRateToBp(vatPct);
    if (!Number.isFinite(vatRateBp)) {
      setMsg("TVA invalide (ex: 8.1).");
      setLoading(false);
      return;
    }

    if (!vendor.trim()) {
      setMsg("Merci d’indiquer un fournisseur / nom.");
      setLoading(false);
      return;
    }

    const payload = {
      date,
      vendor: vendor.trim(),
      category,
      amountGrossCents,
      vatRateBp,
      notes: notes.trim() || null,
    };

    try {
      if (props.mode === "create") {
        await createExpense(payload);
        // reset
        setVendor("");
        setCategory("RESTAURANT");
        setTtc("");
        setVatPct("8.1");
        setNotes("");
      } else {
        await updateExpense({ id: exp.id, ...payload });
      }
      setMsg("✅ Enregistré");
    } catch (e: any) {
      setMsg(e?.message || "Erreur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-3">
      {msg ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">
          {msg}
        </div>
      ) : null}

      <label className="grid gap-1 text-sm">
        <span className="text-xs font-semibold text-slate-600">Date</span>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-2xl border border-slate-200 bg-white px-3 py-2"
        />
      </label>

      <label className="grid gap-1 text-sm">
        <span className="text-xs font-semibold text-slate-600">Fournisseur / Nom</span>
        <input
          value={vendor}
          onChange={(e) => setVendor(e.target.value)}
          placeholder="ex: Garage X, Assurance, Loyer, Restaurant…"
          className="rounded-2xl border border-slate-200 bg-white px-3 py-2"
        />
      </label>

      <label className="grid gap-1 text-sm">
        <span className="text-xs font-semibold text-slate-600">Catégorie</span>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-2xl border border-slate-200 bg-white px-3 py-2"
        >
          {CATEGORY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span className="text-xs font-semibold text-slate-600">TTC (CHF)</span>
          <input
            value={ttc}
            onChange={(e) => setTtc(e.target.value)}
            inputMode="decimal"
            placeholder="ex: 25,00"
            className="rounded-2xl border border-slate-200 bg-white px-3 py-2"
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="text-xs font-semibold text-slate-600">TVA (%)</span>
          <input
            value={vatPct}
            onChange={(e) => setVatPct(e.target.value)}
            inputMode="decimal"
            placeholder="8.1"
            className="rounded-2xl border border-slate-200 bg-white px-3 py-2"
          />
        </label>
      </div>

      <label className="grid gap-1 text-sm">
        <span className="text-xs font-semibold text-slate-600">Notes (optionnel)</span>
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="ex: facture garage, assurance trimestrielle..."
          className="rounded-2xl border border-slate-200 bg-white px-3 py-2"
        />
      </label>

      <button
        onClick={onSubmit}
        disabled={loading}
        className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {loading ? "Enregistrement…" : props.mode === "create" ? "Ajouter" : "Enregistrer"}
      </button>
    </div>
  );
}
