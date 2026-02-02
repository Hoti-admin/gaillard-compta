"use client";

import { useState } from "react";

export default function AddInvoiceCard({ clientId, clientName }: { clientId: string; clientName: string }) {
  const [number, setNumber] = useState("");
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });

  // ✅ on garde en string pour laisser virgule sur iPhone
  const [gross, setGross] = useState("");
  const [vatRate, setVatRate] = useState("8.1"); // ✅ défaut
  const [projectName, setProjectName] = useState(""); // ✅ chantier
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setMsg(null);

    try {
      const res = await fetch("/invoices/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          number,
          issueDate,
          dueDate,
          amountGross: gross,      // ✅ ex: 10695,50
          vatRate: vatRate || "8.1",
          projectName: projectName || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMsg(data?.error || "Erreur");
      } else {
        setMsg("Facture ajoutée ✅");
        setGross("");
        setProjectName("");
      }
    } catch (e: any) {
      setMsg(e?.message || "Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-lg font-extrabold text-slate-900">Ajouter une facture</div>

      <div className="mt-1 text-sm text-slate-600">
        Client: <span className="font-semibold text-slate-900">{clientName}</span>
      </div>

      {/* ✅ Chantier juste au-dessus */}
      <label className="mt-4 block text-xs font-semibold text-slate-600">Chantier / Référence (optionnel)</label>
      <input
        value={projectName}
        onChange={(e) => setProjectName(e.target.value)}
        placeholder="ex: PER24 - Rte des Cliniques 15"
        className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
      />

      <label className="mt-4 block text-xs font-semibold text-slate-600">N° facture *</label>
      <input
        value={number}
        onChange={(e) => setNumber(e.target.value)}
        placeholder="ex: 2026008"
        className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
      />

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-600">Date facture *</label>
          <input
            type="date"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
            className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600">Échéance *</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          />
        </div>
      </div>

      <label className="mt-4 block text-xs font-semibold text-slate-600">TTC (CHF) *</label>
      <input
        inputMode="decimal"
        value={gross}
        onChange={(e) => setGross(e.target.value)}
        placeholder="ex: 10695,50"
        className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
      />

      <label className="mt-4 block text-xs font-semibold text-slate-600">TVA %</label>
      <input
        inputMode="decimal"
        value={vatRate}
        onChange={(e) => setVatRate(e.target.value)}
        placeholder="8.1"
        className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
      />

      {msg ? (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
          {msg}
        </div>
      ) : null}

      <button
        disabled={loading}
        onClick={submit}
        className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 disabled:opacity-50"
      >
        {loading ? "Ajout…" : "+ Ajouter la facture"}
      </button>
    </div>
  );
