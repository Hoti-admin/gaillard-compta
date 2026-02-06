"use client";

import { useState } from "react";

export default function PayInvoiceButton({
  invoiceId,
  grossCents,
}: {
  invoiceId: string;
  grossCents: number;
}) {
  const [open, setOpen] = useState(false);
  const [discountPct, setDiscountPct] = useState<string>("0");
  const [method, setMethod] = useState<string>("Virement");
  const [reference, setReference] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const pct = Math.max(0, Math.min(100, Number(discountPct || 0)));
  const discountCents = Math.round((grossCents * pct) / 100);
  const paidCents = grossCents - discountCents;

  async function submit() {
    setLoading(true);
    try {
      const res = await fetch("/api/invoices/mark-paid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId,
          discountRateBp: Math.round(pct * 100), // 2% => 200bp
          method,
          reference,
        }),
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Erreur paiement");
      }

      setOpen(false);
      window.location.reload();
    } catch (e: any) {
      alert(e?.message ?? "Erreur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-slate-50"
        onClick={() => setOpen(true)}
      >
        Marquer payé
      </button>

      {open && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-lg">
            <div className="text-lg font-extrabold">Paiement</div>
            <div className="mt-1 text-xs text-slate-500">Plein tarif ou escompte (ex: 2%)</div>

            <div className="mt-4 grid gap-3">
              <label className="grid gap-1 text-sm">
                <span className="text-xs font-semibold text-slate-600">Escompte (%)</span>
                <input
                  value={discountPct}
                  onChange={(e) => setDiscountPct(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2"
                  inputMode="decimal"
                />
                <div className="text-xs text-slate-600">
                  Montant payé :{" "}
                  <span className="font-semibold">
                    CHF {(paidCents / 100).toFixed(2)}
                  </span>
                </div>
              </label>

              <label className="grid gap-1 text-sm">
                <span className="text-xs font-semibold text-slate-600">Méthode</span>
                <input
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2"
                />
              </label>

              <label className="grid gap-1 text-sm">
                <span className="text-xs font-semibold text-slate-600">Référence</span>
                <input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2"
                />
              </label>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Annuler
              </button>
              <button
                className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                onClick={submit}
                disabled={loading}
              >
                {loading ? "Validation..." : "Valider paiement"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
