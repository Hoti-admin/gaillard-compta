"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type InvoiceLite = {
  id: string;
  number: string;
  dueDate: string; // ISO
  amountGrossCents: number;
  paidCents: number;
  status: "OPEN" | "PARTIAL" | "PAID";
};

function chf(cents: number) {
  return (cents / 100).toFixed(2);
}

export default function QuickPayButton({
  clientName,
  invoices,
}: {
  clientName: string;
  invoices: InvoiceLite[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const openInvoices = useMemo(
    () => invoices.filter((i) => i.status !== "PAID" && (i.amountGrossCents - i.paidCents) > 0),
    [invoices]
  );

  const [invoiceId, setInvoiceId] = useState(openInvoices[0]?.id || "");
  const selected = useMemo(() => openInvoices.find((i) => i.id === invoiceId), [openInvoices, invoiceId]);

  const remaining = selected ? Math.max(0, selected.amountGrossCents - selected.paidCents) : 0;

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState<string>(() => (remaining ? chf(remaining) : "0.00"));
  const [method, setMethod] = useState<string>("Virement");
  const [reference, setReference] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // quand on change la facture, on remet le montant restant
  function onInvoiceChange(id: string) {
    setInvoiceId(id);
    const inv = openInvoices.find((x) => x.id === id);
    const rem = inv ? Math.max(0, inv.amountGrossCents - inv.paidCents) : 0;
    setAmount(chf(rem));
  }

  async function submit() {
    if (!invoiceId) return alert("Choisis une facture");
    const amt = Math.round(Number(String(amount).replace(",", ".")) * 100);
    if (!Number.isFinite(amt) || amt <= 0) return alert("Montant invalide");

    try {
      setLoading(true);
      const res = await fetch("/api/payments/quick-pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId,
          date,
          amountCents: amt,
          method,
          reference: reference.trim() || undefined,
        }),
      });

      const j = await res.json().catch(() => ({}));
      if (!res.ok) return alert(j.error || "Erreur paiement");

      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (openInvoices.length === 0) {
    return (
      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
        Tout payé
      </span>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          // sync montant si besoin
          const inv = openInvoices.find((x) => x.id === (invoiceId || openInvoices[0].id));
          if (inv) setAmount(chf(Math.max(0, inv.amountGrossCents - inv.paidCents)));
        }}
        className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-extrabold text-white hover:bg-slate-800"
      >
        Payé ⚡
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-[360px] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
          <div className="mb-3">
            <div className="text-sm font-extrabold text-slate-900">Paiement rapide</div>
            <div className="text-xs text-slate-500">{clientName}</div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Facture</label>
              <select
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900"
                value={invoiceId || openInvoices[0]?.id}
                onChange={(e) => onInvoiceChange(e.target.value)}
              >
                {openInvoices.map((i) => {
                  const rem = Math.max(0, i.amountGrossCents - i.paidCents);
                  return (
                    <option key={i.id} value={i.id}>
                      {i.number} — solde {chf(rem)} CHF
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Date paiement</label>
                <input
                  type="date"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Montant (CHF)</label>
                <input
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <div className="mt-1 text-[11px] text-slate-500">
                  Solde restant: <span className="font-bold">{chf(remaining)} CHF</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Méthode</label>
                <select
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900"
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                >
                  <option>Virement</option>
                  <option>Cash</option>
                  <option>Carte</option>
                  <option>TWINT</option>
                  <option>Autre</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Référence</label>
                <input
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900"
                  placeholder="ex: QR / ref banque"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                disabled={loading}
              >
                Fermer
              </button>

              <button
                type="button"
                onClick={submit}
                className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-extrabold text-white hover:bg-emerald-700 disabled:opacity-60"
                disabled={loading}
              >
                {loading ? "..." : "Enregistrer paiement"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
