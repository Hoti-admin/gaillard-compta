"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  invoiceId: string;
  currentNumber: string;
};

export default function InvoiceNumberEditor({ invoiceId, currentNumber }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(currentNumber);
  const [loading, setLoading] = useState(false);

  async function save() {
    const v = value.trim();
    if (!v) return alert("Numéro vide");

    try {
      setLoading(true);
      const res = await fetch("/api/invoices/update-number", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId, number: v }),
      });

      const j = await res.json().catch(() => ({}));
      if (!res.ok) return alert(j.error ?? "Erreur");

      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  function cancel() {
    setValue(currentNumber);
    setOpen(false);
  }

  if (!open) {
    return (
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-slate-900">{currentNumber}</span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50"
          title="Modifier le numéro"
        >
          ✏️ Modifier
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-44 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-900 outline-none focus:border-slate-300"
        placeholder="ex: 2026-015"
      />
      <button
        type="button"
        disabled={loading}
        onClick={save}
        className="rounded-xl bg-slate-900 px-2.5 py-1 text-xs font-extrabold text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {loading ? "..." : "OK"}
      </button>
      <button
        type="button"
        disabled={loading}
        onClick={cancel}
        className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
      >
        Annuler
      </button>
    </div>
  );
}
