"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  invoiceId: string;
  remainingCents: number; // solde restant (cents)
};

export default function InvoicePayButton({ invoiceId, remainingCents }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const today = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const [date, setDate] = useState(today);

  async function payFull() {
    try {
      setLoading(true);

      const res = await fetch("/api/invoices/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId,
          date,
          // amountCents non fourni => paiement du solde restant
        }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j.error ?? "Erreur paiement");
        return;
      }

      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (remainingCents <= 0) {
    return (
      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800">
        Payée
      </span>
    );
  }

  return (
    <div className="flex items-center justify-end">
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-50"
      >
        Marquer payé
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-extrabold text-slate-900">Paiement</div>
                <div className="text-xs text-slate-600">
                  Solde: {(remainingCents / 100).toFixed(2)} CHF
                </div>
              </div>

              <button
                onClick={() => setOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                ✕
              </button>
            </div>

            <div className="mt-4">
              <label className="text-xs font-semibold text-slate-600">Date de paiement</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-slate-300"
              />
            </div>

            <button
              disabled={loading}
              onClick={payFull}
              className="mt-4 w-full rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {loading ? "Paiement..." : "Valider (payer le solde)"}
            </button>

            <div className="mt-3 text-xs text-slate-500">
              (On enregistrera un paiement et le statut passera automatiquement à OPEN / PARTIAL / PAID.)
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
