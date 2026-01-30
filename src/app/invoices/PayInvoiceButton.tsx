"use client";

import { useState } from "react";
import { markInvoicePaid } from "./actions";

export default function PayInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"FULL" | "DISCOUNT" | "CUSTOM">("FULL");
  const [discountPct, setDiscountPct] = useState("2"); // 2% par défaut
  const [customPaid, setCustomPaid] = useState(""); // CHF
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setMsg(null);

    try {
      if (mode === "FULL") {
        await markInvoicePaid({ invoiceId, mode: "FULL" });
      } else if (mode === "DISCOUNT") {
        const pct = Number(discountPct);
        if (!Number.isFinite(pct) || pct <= 0) throw new Error("Pourcentage invalide");
        const bp = Math.round(pct * 100); // 2% => 200 bp
        await markInvoicePaid({ invoiceId, mode: "DISCOUNT", discountRateBp: bp });
      } else {
        const chf = Number(customPaid);
        if (!Number.isFinite(chf) || chf < 0) throw new Error("Montant invalide");
        const cents = Math.round(chf * 100);
        await markInvoicePaid({ invoiceId, mode: "CUSTOM", customPaidCents: cents });
      }

      setOpen(false);
    } catch (e: any) {
      setMsg(e?.message || "Erreur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
      >
        Marquer payé
      </button>

      {open ? (
        <div className="absolute right-0 z-20 mt-2 w-[280px] rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="text-xs font-semibold text-slate-700">Paiement</div>

          <div className="mt-3 grid gap-2 text-xs">
            <label className="flex items-center gap-2">
              <input type="radio" checked={mode === "FULL"} onChange={() => setMode("FULL")} />
              Plein montant
            </label>

            <label className="flex items-center gap-2">
              <input type="radio" checked={mode === "DISCOUNT"} onChange={() => setMode("DISCOUNT")} />
              Escompte (%)
            </label>

            {mode === "DISCOUNT" ? (
              <input
                value={discountPct}
                onChange={(e) => setDiscountPct(e.target.value)}
                placeholder="2"
                className="w-full rounded-xl border border-slate-200 px-2 py-2 text-xs"
              />
            ) : null}

            <label className="flex items-center gap-2">
              <input type="radio" checked={mode === "CUSTOM"} onChange={() => setMode("CUSTOM")} />
              Montant manuel (CHF)
            </label>

            {mode === "CUSTOM" ? (
              <input
                value={customPaid}
                onChange={(e) => setCustomPaid(e.target.value)}
                placeholder="ex: 980.00"
                className="w-full rounded-xl border border-slate-200 px-2 py-2 text-xs"
              />
            ) : null}

            {msg ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-2 py-2 text-xs text-rose-800">
                {msg}
              </div>
            ) : null}

            <button
              type="button"
              disabled={loading}
              onClick={submit}
              className="mt-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              {loading ? "..." : "Valider paiement"}
            </button>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800"
            >
              Annuler
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
