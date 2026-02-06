"use client";

import { useMemo, useState } from "react";

function chf(cents: number) {
  return `CHF ${(cents / 100).toFixed(2)}`;
}

export default function MarkPaidButton(props: {
  invoiceId: string;
  invoiceNumber: string;
  grossCents: number;
}) {
  const { invoiceId, invoiceNumber, grossCents } = props;

  const [open, setOpen] = useState(false);
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [mode, setMode] = useState<"FULL" | "DISCOUNT">("FULL");
  const [discountPct, setDiscountPct] = useState<string>("2"); // ex: 2%
  const [loading, setLoading] = useState(false);

  const computed = useMemo(() => {
    if (mode === "FULL") {
      return { paidCents: grossCents, discountCents: 0, discountRateBp: null as number | null };
    }

    const pct = Number(discountPct);
    const safePct = Number.isFinite(pct) ? Math.max(0, Math.min(100, pct)) : 0;
    const rateBp = Math.round(safePct * 100); // 2% -> 200 bp
    const discountCents = Math.round((grossCents * rateBp) / 10000);
    const paidCents = Math.max(0, grossCents - discountCents);

    return { paidCents, discountCents, discountRateBp: rateBp };
  }, [mode, discountPct, grossCents]);

  async function submit() {
    setLoading(true);
    try {
      const res = await fetch("/api/invoices/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId,
          paidAt,
          paidAmountCents: computed.paidCents,
          discountRateBp: computed.discountRateBp,
          discountCents: computed.discountCents,
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
        onClick={() => setOpen(true)}
        className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
      >
        Valider paiement
      </button>

      {open ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white shadow-xl">
            <div className="border-b border-slate-200 p-5">
              <div className="text-lg font-extrabold text-slate-900">
                Paiement facture {invoiceNumber}
              </div>
              <div className="mt-1 text-sm text-slate-600">Montant TTC: {chf(grossCents)}</div>
            </div>

            <div className="grid gap-4 p-5">
              <label className="grid gap-1">
                <span className="text-xs font-semibold text-slate-600">Date de paiement</span>
                <input
                  type="date"
                  value={paidAt}
                  onChange={(e) => setPaidAt(e.target.value)}
                  className="rounded-2xl border border-slate-200 px-3 py-2"
                />
              </label>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="text-sm font-semibold text-slate-900">Mode</div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <label className="flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2">
                    <input
                      type="radio"
                      checked={mode === "FULL"}
                      onChange={() => setMode("FULL")}
                    />
                    <span className="text-sm">Plein tarif</span>
                  </label>

                  <label className="flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2">
                    <input
                      type="radio"
                      checked={mode === "DISCOUNT"}
                      onChange={() => setMode("DISCOUNT")}
                    />
                    <span className="text-sm">Avec escompte</span>
                  </label>
                </div>

                {mode === "DISCOUNT" ? (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <label className="grid gap-1">
                      <span className="text-xs font-semibold text-slate-600">Escompte (%)</span>
                      <input
                        value={discountPct}
                        onChange={(e) => setDiscountPct(e.target.value)}
                        className="rounded-2xl border border-slate-200 px-3 py-2"
                        placeholder="ex: 2"
                      />
                    </label>

                    <div className="rounded-2xl bg-slate-50 p-3">
                      <div className="text-xs text-slate-600">Remise</div>
                      <div className="text-sm font-extrabold text-slate-900">
                        {chf(computed.discountCents)}
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="mt-3 rounded-2xl bg-emerald-50 p-3">
                  <div className="text-xs text-emerald-800">Montant payé</div>
                  <div className="text-lg font-extrabold text-emerald-900">
                    {chf(computed.paidCents)}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-200 p-5">
              <button
                onClick={() => setOpen(false)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
                disabled={loading}
              >
                Annuler
              </button>

              <button
                onClick={submit}
                disabled={loading}
                className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {loading ? "Validation..." : "Valider"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
