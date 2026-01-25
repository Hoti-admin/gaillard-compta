"use client";

import { useState } from "react";

export default function InvoiceCreateForm({ clientId }: { clientId: string }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    const fd = new FormData(e.currentTarget);

    const payload = {
      clientId,
      number: String(fd.get("number") || "").trim(),
      issueDate: String(fd.get("issueDate") || ""),
      dueDate: String(fd.get("dueDate") || ""),
      totalTtc: Number(fd.get("totalTtc") || 0),
      vatRateBp: Number(fd.get("vatRateBp") || 810),
    };

    try {
      const res = await fetch("/api/invoices/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Erreur création facture");
      }

      setMsg("✅ Facture créée.");
      (e.target as HTMLFormElement).reset();
      // refresh simple
      window.location.reload();
    } catch (err: any) {
      setMsg("❌ " + (err?.message || "Erreur"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900">Ajouter une facture</h2>
      <p className="text-sm text-slate-600">Numéro modifiable (auto-num si tu veux, mais tu peux changer).</p>

      <form onSubmit={onSubmit} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-5">
        <div className="md:col-span-1">
          <label className="mb-1 block text-xs font-bold text-slate-600">N° facture *</label>
          <input
            name="number"
            required
            placeholder="2026-001"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-slate-300"
          />
        </div>

        <div className="md:col-span-1">
          <label className="mb-1 block text-xs font-bold text-slate-600">Date facture *</label>
          <input
            type="date"
            name="issueDate"
            required
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-slate-300"
          />
        </div>

        <div className="md:col-span-1">
          <label className="mb-1 block text-xs font-bold text-slate-600">Échéance *</label>
          <input
            type="date"
            name="dueDate"
            required
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-slate-300"
          />
        </div>

        <div className="md:col-span-1">
          <label className="mb-1 block text-xs font-bold text-slate-600">TTC (CHF) *</label>
          <input
            name="totalTtc"
            required
            inputMode="decimal"
            placeholder="1799.85"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-slate-300"
          />
        </div>

        <div className="md:col-span-1">
          <label className="mb-1 block text-xs font-bold text-slate-600">TVA bp</label>
          <input
            name="vatRateBp"
            defaultValue="810"
            placeholder="810 = 8.1%"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-slate-300"
          />
        </div>

        <div className="md:col-span-5 flex items-center gap-2">
          <button
            disabled={loading}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-extrabold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {loading ? "Création…" : "+ Ajouter la facture"}
          </button>

          {msg ? <span className="text-sm text-slate-700">{msg}</span> : null}
        </div>
      </form>
    </div>
  );
}
