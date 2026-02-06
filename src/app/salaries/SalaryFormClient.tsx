"use client";

import { useMemo, useState } from "react";
import { createSalary } from "./actions";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function SalaryFormClient({ defaultYm }: { defaultYm: string }) {
  const defaultDate = useMemo(() => {
    // par défaut: dernier jour du mois choisi
    const [y, m] = defaultYm.split("-").map(Number);
    const last = new Date(Date.UTC(y, m, 0, 12, 0, 0)); // jour 0 du mois suivant = dernier du mois
    return last.toISOString().slice(0, 10);
  }, [defaultYm]);

  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  return (
    <form
      action={async (fd) => {
        setError(null);
        setOk(null);
        const res = await createSalary(fd);
        if (!res.ok) {
          setError(res.error ?? "Erreur");
          return;
        }
        setOk("Salaire ajouté ✅");
      }}
      className="space-y-3"
    >
      <div>
        <label className="text-xs font-semibold text-slate-600">Employé</label>
        <input
          name="employee"
          placeholder="Ex: Franco"
          className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-semibold text-slate-600">Type</label>
          <select
            name="type"
            className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
            defaultValue="SALAIRE_EMPLOYE"
          >
            <option value="SALAIRE_EMPLOYE">Salaire employé</option>
            <option value="SALAIRE_CADRE">Salaire cadre</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600">Date</label>
          <input
            name="date"
            type="date"
            defaultValue={defaultDate || todayIso()}
            className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
            required
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-slate-600">Montant (CHF)</label>
        <input
          name="amount"
          inputMode="decimal"
          placeholder="Ex: 4500.00"
          className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
          required
        />
        <div className="mt-1 text-[11px] text-slate-500">
          Formats acceptés : 4500 / 4500.50 / 4'500.50 (évite l’apostrophe si possible)
        </div>
      </div>

      <button className="w-full rounded-2xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">
        Ajouter
      </button>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800">
          {error}
        </div>
      ) : null}

      {ok ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
          {ok}
        </div>
      ) : null}
    </form>
  );
}
