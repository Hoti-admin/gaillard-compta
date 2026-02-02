"use client";

import { useState } from "react";
import { markInvoicePaid } from "./actions";

function moneyInputToCents(raw: string): number {
  // accepte: "10695.50" ou "10'695.50" ou "10695,50" ou "10 695,50"
  const cleaned = raw
    .trim()
    .replace(/['\s]/g, "")
    .replace(",", ".");
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return NaN;
  return Math.round(n * 100);
}

export default function PayInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"FULL" | "DISCOUNT" | "CUSTOM">("FULL");
  const [discountPct, setDiscountPct] = useState("2"); // % (ex: 2)
  const [customPaid, setCustomPaid] = useState(""); // CHF
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onConfirm() {
    setLoading(true);
    setMsg(null);

    try {
      if (mode === "FULL") {
        await markInvoicePaid({ invoiceId, mode: "FULL" });
      }

      if (mode === "DISCOUNT") {
        const pct = Number(discountPct.replace(",", "."));
        if (!Number.isFinite(pct) || pct <= 0 || pct >= 100) {
          setMsg("Taux d’escompte invalide (ex: 2).");
          setLoading(false);
          return;
        }
        // Prisma: discountRateBp = basis points => 2% = 200
        await markInvoicePaid({
          invoiceId,
          mode: "DISCOUNT",
          discountRateBp: Math.round(pct * 100),
        });
      }

      if (mode === "CUSTOM") {
        const cents = moneyInputToCents(customPaid);
        if (!Number.isFinite(cents) || cents < 0) {
          setMsg("Montant payé invalide (ex: 2082.16).");
          setLoading(false);
          return;
        }
        await markInvoicePaid({
          invoiceId,
          mode: "CUSTOM",
          customPaidCents: cents,
        });
      }

      setOpen(false);
      setMode("FULL");
      setDiscountPct("2");
      setCustomPaid("");
    } catch (e: any) {
      setMsg(e?.message || "Erreur paiement");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
      >
        Marquer payé
      </button>

      {/* ✅ MODAL FIXED : ne se cache jamais */}
      {open ? (
        <div className="fixed inset-0 z-[9999]">
          {/* overlay */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => (loading ? null : setOpen(false))}
          />

          {/* panel */}
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
              <div className="text-base font-extrabold text-slate-900">
                Paiement
              </div>
              <div className="mt-1 text-sm text-slate-600">
                Choisis le mode de paiement.
              </div>

              {msg ? (
                <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                  {msg}
                </div>
              ) : null}

              <div className="mt-4 grid gap-2 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={mode === "FULL"}
                    onChange={() => setMode("FULL")}
                  />
                  Plein montant
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={mode === "DISCOUNT"}
                    onChange={() => setMode("DISCOUNT")}
                  />
                  Escompte (%)
                </label>

                {mode === "DISCOUNT" ? (
                  <input
                    value={discountPct}
                    onChange={(e) => setDiscountPct(e.target.value)}
                    inputMode="decimal"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                    placeholder="ex: 2"
                  />
                ) : null}

                <label className="mt-1 flex items-center gap-2">
                  <input
                    type="radio"
                    checked={mode === "CUSTOM"}
                    onChange={() => setMode("CUSTOM")}
                  />
                  Montant manuel (CHF)
                </label>

                {mode === "CUSTOM" ? (
                  <input
                    value={customPaid}
                    onChange={(e) => setCustomPaid(e.target.value)}
                    inputMode="decimal"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                    placeholder="ex: 2082,16"
                  />
                ) : null}
              </div>

              <div className="mt-4 grid gap-2">
                <button
                  onClick={onConfirm}
                  disabled={loading}
                  className="inline-flex items-center justify-center rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
                >
                  {loading ? "Validation…" : "Valider paiement"}
                </button>

                <button
                  onClick={() => setOpen(false)}
                  disabled={loading}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                >
                  Annuler
                </button>
              </div>

              <div className="mt-3 text-xs text-slate-500">
                Astuce iPhone : tu peux écrire <b>2082,16</b> (virgule OK).
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
