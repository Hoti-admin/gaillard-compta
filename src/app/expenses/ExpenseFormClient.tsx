"use client";

import { useMemo, useState, useTransition } from "react";
import { createExpense, updateExpense } from "./actions";
import type { Expense, ExpenseCategory } from "@prisma/client";

type Mode = "create" | "edit";

const categories: { value: ExpenseCategory; label: string }[] = [
  { value: "RESTAURANT", label: "Restaurant" },
  { value: "CARBURANT", label: "Carburant" },
  { value: "PARKING", label: "Parking" },
  { value: "FOURNITURES", label: "Fournitures" },
  { value: "OUTILLAGE", label: "Outillage" },
  { value: "TELEPHONE", label: "Téléphone" },
  { value: "INTERNET", label: "Internet" },
  { value: "TRANSPORT", label: "Transport" },
  { value: "LOYER", label: "Loyer" },
  { value: "DEPOT", label: "Dépôt" },
  { value: "ASSURANCE_MALADIE", label: "Assurance maladie" },
  { value: "ASSURANCE_LPP", label: "Assurance LPP" },
  { value: "AUTRE", label: "Autre" },
  { value: "DIVERS", label: "Divers" },
];

function centsToChf(cents?: number | null) {
  const n = (cents ?? 0) / 100;
  return n.toFixed(2);
}

function isoDate(d: Date) {
  // yyyy-mm-dd
  const x = new Date(d);
  const yyyy = x.getFullYear();
  const mm = String(x.getMonth() + 1).padStart(2, "0");
  const dd = String(x.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function ExpenseFormClient(props: {
  mode: Mode;
  initial?: Expense | null;
  onDone?: () => void;
}) {
  const { mode, initial, onDone } = props;

  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const defaults = useMemo(() => {
    const today = isoDate(new Date());
    return {
      id: initial?.id ?? "",
      date: initial?.date ? isoDate(initial.date as any) : today,
      vendor: initial?.vendor ?? "",
      category: (initial?.category as ExpenseCategory) ?? "RESTAURANT",
      ttc: centsToChf(initial?.amountGrossCents),
      vat: ((initial?.vatRateBp ?? 810) / 100).toFixed(1), // 810 => "8.1"
      notes: initial?.notes ?? "",
    };
  }, [initial]);

  async function onSubmit(formData: FormData) {
    setError(null);

    start(async () => {
      try {
        if (mode === "edit") {
          await updateExpense(formData);
        } else {
          await createExpense(formData);
        }
        onDone?.();
      } catch (e: any) {
        setError(e?.message ?? "Erreur");
      }
    });
  }

  return (
    <form action={onSubmit} className="grid gap-3">
      {mode === "edit" ? <input type="hidden" name="id" defaultValue={defaults.id} /> : null}

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <div className="grid gap-1">
        <label className="text-xs font-semibold text-slate-600">Date</label>
        <input
          name="date"
          type="date"
          defaultValue={defaults.date}
          required
          className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
        />
      </div>

      <div className="grid gap-1">
        <label className="text-xs font-semibold text-slate-600">Nom / Fournisseur</label>
        <input
          name="vendor"
          defaultValue={defaults.vendor}
          required
          placeholder="ex: Restaurant, Coop, Loyer, Assurance…"
          className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1">
          <label className="text-xs font-semibold text-slate-600">Catégorie</label>
          <select
            name="category"
            defaultValue={defaults.category}
            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          >
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-1">
          <label className="text-xs font-semibold text-slate-600">TVA %</label>
          <select
            name="vat"
            defaultValue={defaults.vat}
            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          >
            <option value="0">0%</option>
            <option value="2.6">2.6%</option>
            <option value="8.1">8.1%</option>
          </select>
        </div>
      </div>

      <div className="grid gap-1">
        <label className="text-xs font-semibold text-slate-600">Montant TTC (CHF)</label>
        <input
          name="ttc"
          inputMode="decimal"
          defaultValue={defaults.ttc}
          required
          placeholder="ex: 25.00"
          className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
        />
      </div>

      <div className="grid gap-1">
        <label className="text-xs font-semibold text-slate-600">Notes (optionnel)</label>
        <input
          name="notes"
          defaultValue={defaults.notes}
          placeholder="ex: repas chantier, parking client…"
          className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
        />
      </div>

      <button
        disabled={pending}
        className="mt-2 inline-flex items-center justify-center rounded-2xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 disabled:opacity-50"
      >
        {pending ? "Enregistrement…" : mode === "edit" ? "Enregistrer" : "Ajouter"}
      </button>
    </form>
  );
}
