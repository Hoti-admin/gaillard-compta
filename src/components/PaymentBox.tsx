"use client";

import { useMemo, useState } from "react";

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function PaymentBox({
  invoiceId,
  remainingCents,
}: {
  invoiceId: string;
  remainingCents: number;
}) {
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(iso(new Date()));
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("");
  const [reference, setReference] = useState("");

  const remainingCHF = useMemo(() => (remainingCents / 100).toFixed(2), [remainingCents]);

  async function addPayment(payAll: boolean) {
    setLoading(true);
    try {
      const amt = payAll ? Number(remainingCHF) : Number(amount);
      const res = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId,
          date,
          amount: amt,
          method: method.trim() ? method.trim() : null,
          reference: reference.trim() ? reference.trim() : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erreur");

      window.location.reload();
    } catch (e: any) {
      alert(e?.message || "Erreur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-6">
        <div>
          <label className="text-xs font-semibold text-slate-600">Date paiement</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-300"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600">Montant (CHF)</label>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={`ex: 500.00 (solde: ${remainingCHF})`}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-300"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600">Méthode</label>
          <input
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            placeholder="Virement / Cash / TWINT..."
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-300"
          />
        </div>

        <div className="md:col-span-2">
          <label className="text-xs font-semibold text-slate-600">Référence</label>
          <input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Réf / note"
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-300"
          />
        </div>

        <div className="flex items-end gap-2">
          <button
            disabled={loading || remainingCents <= 0}
            onClick={() => addPayment(true)}
            className="w-full rounded-xl bg-emerald-700 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
            title="Marquer la facture comme payée (solde restant)"
          >
            {loading ? "..." : `Payé (${remainingCHF})`}
          </button>
        </div>

        <div className="md:col-span-6">
          <button
            disabled={loading}
            onClick={() => addPayment(false)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100 disabled:opacity-60"
          >
            Ajouter paiement partiel
          </button>
        </div>
      </div>
    </div>
  );
}
