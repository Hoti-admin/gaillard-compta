"use client";

import { useMemo, useState, useTransition } from "react";

// ⚠️ adapte le nom si besoin (selon ton projet)
import { createInvoiceForClient } from "./actions";

type Props = {
  clientId: string;
  clientName: string;
};

function toCentsFromInput(value: string): number | null {
  // iPhone / FR : "10695,50" -> "10695.50"
  const cleaned = value
    .replace(/\s/g, "")
    .replace(/’/g, "")
    .replace(/,/g, ".")
    .replace(/[^\d.]/g, "");

  if (!cleaned) return null;

  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;

  return Math.round(n * 100);
}

function toBpFromInput(value: string): number | null {
  // ex "8.1" => 810 bp, "8,1" ok aussi
  const cleaned = value.replace(/\s/g, "").replace(/,/g, ".");
  if (!cleaned) return null;

  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;

  return Math.round(n * 100); // 8.1 * 100 = 810
}

function formatChf(cents: number) {
  return `CHF ${(cents / 100).toFixed(2)}`;
}

export default function AddInvoiceCard({ clientId, clientName }: Props) {
  const [pending, startTransition] = useTransition();

  const [number, setNumber] = useState("");
  const [issueDate, setIssueDate] = useState(() => {
    // yyyy-mm-dd
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });

  // ✅ default 8.1
  const [vatStr, setVatStr] = useState("8.1");

  // ✅ TTC
  const [grossStr, setGrossStr] = useState("");

  // ✅ Chantier / Référence
  const [siteName, setSiteName] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const grossCents = useMemo(() => toCentsFromInput(grossStr), [grossStr]);
  const vatBp = useMemo(() => toBpFromInput(vatStr), [vatStr]);

  const computed = useMemo(() => {
    if (grossCents == null || vatBp == null) return null;

    const vat = Math.round((grossCents * vatBp) / (10000 + vatBp));
    const net = grossCents - vat;

    return {
      grossCents,
      vatCents: vat,
      netCents: net,
      vatBp,
    };
  }, [grossCents, vatBp]);

  async function onSubmit() {
    setError(null);
    setOk(null);

    if (!number.trim()) return setError("Numéro de facture requis.");
    if (!issueDate) return setError("Date facture requise.");
    if (!dueDate) return setError("Échéance requise.");

    if (computed == null) return setError("Montant TTC invalide (ex: 10695.50 ou 10695,50).");

    if (computed.grossCents <= 0) return setError("Le TTC doit être > 0.");
    if (computed.vatBp == null) return setError("TVA invalide (ex: 8.1).");

    startTransition(async () => {
      try {
        await createInvoiceForClient({
          clientId,
          number: number.trim(),
          issueDate,
          dueDate,
          amountGrossCents: computed.grossCents,
          vatRateBp: computed.vatBp,
          // ✅ on stocke le chantier dans notes (simple) — ou tu peux créer une colonne dédiée plus tard
          notes: siteName?.trim() ? `Chantier: ${siteName.trim()}` : null,
        });

        setOk("Facture ajoutée ✅");
        setNumber("");
        setGrossStr("");
        setSiteName("");
      } catch (e: any) {
        setError(e?.message ?? "Erreur lors de l’ajout de la facture.");
      }
    });
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-lg font-extrabold text-slate-900">Ajouter une facture</div>
      <div className="mt-1 text-sm text-slate-600">
        Client : <span className="font-semibold text-slate-900">{clientName}</span>
      </div>

      <div className="mt-4 grid gap-3">
        {/* Chantier */}
        <div>
          <label className="text-xs font-semibold text-slate-600">Chantier / Référence</label>
          <input
            value={siteName}
            onChange={(e) => setSiteName(e.target.value)}
            placeholder="ex: PER24 - Rte des Cliniques 15"
            className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
          />
        </div>

        {/* N° */}
        <div>
          <label className="text-xs font-semibold text-slate-600">N° facture *</label>
          <input
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="ex: 2026008"
            className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
          />
        </div>

        {/* Dates */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-slate-600">Date facture *</label>
            <input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Échéance *</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Montants */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-slate-600">TTC (CHF) *</label>
            <input
              inputMode="decimal"
              value={grossStr}
              onChange={(e) => setGrossStr(e.target.value)}
              placeholder="ex: 10695,50"
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
            <div className="mt-1 text-[11px] text-slate-500">Virgule ou point accepté (iPhone ok).</div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">TVA %</label>
            <input
              inputMode="decimal"
              value={vatStr}
              onChange={(e) => setVatStr(e.target.value)}
              placeholder="8.1"
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
            <div className="mt-1 text-[11px] text-slate-500">Par défaut : 8.1</div>
          </div>
        </div>

        {/* Calcul */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            <div>
              <span className="text-slate-600">HT :</span>{" "}
              <span className="font-semibold text-slate-900">
                {computed ? formatChf(computed.netCents) : "—"}
              </span>
            </div>
            <div>
              <span className="text-slate-600">TVA :</span>{" "}
              <span className="font-semibold text-slate-900">
                {computed ? formatChf(computed.vatCents) : "—"}
              </span>
            </div>
            <div>
              <span className="text-slate-600">TTC :</span>{" "}
              <span className="font-semibold text-slate-900">
                {computed ? formatChf(computed.grossCents) : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Messages */}
        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            ❌ {error}
          </div>
        ) : null}

        {ok ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            ✅ {ok}
          </div>
        ) : null}

        {/* Bouton */}
        <button
          type="button"
          onClick={onSubmit}
          disabled={pending}
          className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {pending ? "Ajout..." : "+ Ajouter la facture"}
        </button>
      </div>
    </div>
  );
}
