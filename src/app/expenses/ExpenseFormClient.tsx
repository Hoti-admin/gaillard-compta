"use client";

import { useState, useTransition } from "react";
import type { Expense, ExpenseCategory } from "@prisma/client";
import { createExpense, updateExpense } from "./actions";

type Mode = "create" | "edit";

export default function ExpenseFormClient(props: {
  mode: Mode;
  initial?: Expense;
  onDone?: () => void;
}) {
  const isEdit = props.mode === "edit";

  const [date, setDate] = useState(() => {
    if (isEdit && props.initial?.date) {
      const d = new Date(props.initial.date as any);
      return d.toISOString().slice(0, 10);
    }
    return new Date().toISOString().slice(0, 10);
  });

  const [vendor, setVendor] = useState(isEdit ? props.initial?.vendor ?? "" : "");
  const [category, setCategory] = useState<string>(
    isEdit ? String(props.initial?.category ?? "DIVERS") : "DIVERS"
  );

  // On stocke TTC & TVA en "strings" pour éviter les bugs mobile (virgule, espaces, etc.)
  const [ttc, setTtc] = useState(() => {
    if (isEdit && typeof props.initial?.amountGrossCents === "number") {
      return (props.initial.amountGrossCents / 100).toFixed(2);
    }
    return "";
  });

  const [vat, setVat] = useState(() => {
    if (isEdit && typeof props.initial?.vatRateBp === "number") {
      return (props.initial.vatRateBp / 100).toFixed(2); // 810 -> "8.10"
    }
    return "8.1";
  });

  const [notes, setNotes] = useState(isEdit ? props.initial?.notes ?? "" : "");
  const [error, setError] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  function buildFormData() {
    const fd = new FormData();

    if (isEdit) {
      fd.set("id", String(props.initial?.id ?? ""));
    }

    fd.set("date", date);
    fd.set("vendor", vendor);
    fd.set("category", category);
    fd.set("ttc", ttc);
    fd.set("vat", vat);
    fd.set("notes", notes);

    return fd;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const fd = buildFormData();

    startTransition(async () => {
      try {
        if (isEdit) {
          await updateExpense(fd);
        } else {
          await createExpense(fd);
          // reset form après create
          setVendor("");
          setCategory("DIVERS");
          setTtc("");
          setVat("8.1");
          setNotes("");
          setDate(new Date().toISOString().slice(0, 10));
        }

        props.onDone?.();
      } catch (err: any) {
        setError(err?.message ?? "Erreur inconnue");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-semibold text-slate-600">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
            required
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600">Catégorie</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
            required
          >
            <option value="RESTAURANT">Restaurant</option>
            <option value="CARBURANT">Carburant</option>
            <option value="PARKING">Parking</option>
            <option value="FOURNITURES">Fournitures</option>
            <option value="OUTILLAGE">Outillage</option>
            <option value="TELEPHONE">Téléphone</option>
            <option value="INTERNET">Internet</option>
            <option value="TRANSPORT">Transport</option>
            <option value="DIVERS">Divers</option>
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-slate-600">Nom / Fournisseur</label>
        <input
          value={vendor}
          onChange={(e) => setVendor(e.target.value)}
          placeholder="Ex: Coop, Garage X, Assurance Y…"
          className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
          required
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-semibold text-slate-600">Montant TTC (CHF)</label>
          <input
            inputMode="decimal"
            value={ttc}
            onChange={(e) => setTtc(e.target.value)}
            placeholder="ex: 125.50"
            className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
            required
          />
          <div className="mt-1 text-[11px] text-slate-500">Tu peux écrire 125,50 ou 125.50</div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600">TVA (%)</label>
          <input
            inputMode="decimal"
            value={vat}
            onChange={(e) => setVat(e.target.value)}
            className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
          />
          <div className="mt-1 text-[11px] text-slate-500">Par défaut : 8.1</div>
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-slate-600">Note (optionnel)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="ex: Loyer dépôt, LPP, réparation véhicule…"
          className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
          rows={3}
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-2xl bg-blue-700 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-blue-800 disabled:opacity-60"
      >
        {isPending ? "Enregistrement..." : isEdit ? "Enregistrer" : "Ajouter"}
      </button>
    </form>
  );
}
