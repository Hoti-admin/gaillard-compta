"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type ClientRow = { id: string; name: string };

function toCents(v: string) {
  const n = Number(String(v).replace(",", "."));
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export default function InvoiceCreateForm() {
  const sp = useSearchParams();
  const clientIdFromUrl = sp.get("clientId") ?? "";

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [clientId, setClientId] = useState(clientIdFromUrl);
  const [number, setNumber] = useState("");
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date(Date.now() + 30 * 86400000);
    return d.toISOString().slice(0, 10);
  });
  const [projectName, setProjectName] = useState("");

  const [vatRateBp, setVatRateBp] = useState("810"); // 8.10% = 810 bp
  const [amountGross, setAmountGross] = useState(""); // TTC en CHF

  const grossCents = useMemo(() => toCents(amountGross), [amountGross]);
  const vatBp = useMemo(() => {
    const n = Number(vatRateBp);
    return Number.isFinite(n) ? n : 810;
  }, [vatRateBp]);

  const computed = useMemo(() => {
    const vatRate = vatBp / 10000;
    const net = vatRate > 0 ? Math.round(grossCents / (1 + vatRate)) : grossCents;
    const vat = Math.max(0, grossCents - net);
    return { net, vat };
  }, [grossCents, vatBp]);

  // Charger clients
  useEffect(() => {
    (async () => {
      const res = await fetch("/api/clients/list");
      if (!res.ok) return;
      const data = await res.json();
      setClients(data?.clients ?? []);
    })();
  }, []);

  // Si l’URL contient clientId, on le garde
  useEffect(() => {
    if (clientIdFromUrl) setClientId(clientIdFromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientIdFromUrl]);

  // ✅ Numéro auto (basé sur l'année de issueDate)
  useEffect(() => {
    (async () => {
      const y = Number(issueDate.slice(0, 4));
      if (!Number.isFinite(y)) return;

      const res = await fetch(`/api/invoices/next-number?year=${y}`);
      if (!res.ok) return;

      const data = await res.json();
      const next = String(data?.nextNumber ?? "").trim();
      if (!next) return;

      // On ne force pas si l'utilisateur a déjà tapé un numéro
      setNumber((prev) => (prev.trim() ? prev : next));
    })();
  }, [issueDate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId) return alert("Choisis un client");
    if (!number.trim()) return alert("Numéro facture manquant");
    if (!grossCents) return alert("Entre un montant TTC");

    setLoading(true);
    try {
      const res = await fetch("/api/invoices/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          number: number.trim(),
          clientId,
          issueDate,
          dueDate,
          projectName: projectName.trim() || null,
          vatRateBp: vatBp,
          amountGrossCents: grossCents,
          amountNetCents: computed.net,
          amountVatCents: computed.vat,
        }),
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Erreur création facture");
      }

      window.location.href = "/invoices";
    } catch (err: any) {
      alert(err?.message ?? "Erreur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <label className="grid gap-1">
        <span className="text-xs font-semibold text-slate-600">Client *</span>
        <select
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className="rounded-2xl border border-slate-200 px-3 py-2"
          required
        >
          <option value="">— Choisir —</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1">
          <span className="text-xs font-semibold text-slate-600">N° facture *</span>
          <input
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            className="rounded-2xl border border-slate-200 px-3 py-2"
            placeholder="ex: 2026001"
            required
          />
          <div className="text-[11px] text-slate-500">Auto si vide (selon l’année de la date facture)</div>
        </label>

        <label className="grid gap-1">
          <span className="text-xs font-semibold text-slate-600">Projet (optionnel)</span>
          <input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="rounded-2xl border border-slate-200 px-3 py-2"
            placeholder="ex: PPE Pommiers 8b"
          />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1">
          <span className="text-xs font-semibold text-slate-600">Date facture *</span>
          <input
            type="date"
            value={issueDate}
            onChange={(e) => {
              setIssueDate(e.target.value);
              // si tu changes l’année, on permet à l’auto de proposer un nouveau numéro si tu n’as pas modifié
              setNumber((prev) => (prev.trim() ? prev : ""));
            }}
            className="rounded-2xl border border-slate-200 px-3 py-2"
            required
          />
        </label>

        <label className="grid gap-1">
          <span className="text-xs font-semibold text-slate-600">Échéance *</span>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="rounded-2xl border border-slate-200 px-3 py-2"
            required
          />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <label className="grid gap-1">
          <span className="text-xs font-semibold text-slate-600">TVA (bp)</span>
          <input
            value={vatRateBp}
            onChange={(e) => setVatRateBp(e.target.value)}
            className="rounded-2xl border border-slate-200 px-3 py-2"
            placeholder="810"
          />
          <div className="text-[11px] text-slate-500">8.1% = 810</div>
        </label>

        <label className="grid gap-1 md:col-span-2">
          <span className="text-xs font-semibold text-slate-600">Montant TTC (CHF) *</span>
          <input
            value={amountGross}
            onChange={(e) => setAmountGross(e.target.value)}
            className="rounded-2xl border border-slate-200 px-3 py-2"
            placeholder="ex: 1799.85"
            required
          />
        </label>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
        <div className="grid gap-2 sm:grid-cols-3">
          <div>
            <div className="text-xs text-slate-600">HT (calculé)</div>
            <div className="font-extrabold text-slate-900">CHF {(computed.net / 100).toFixed(2)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-600">TVA (calculée)</div>
            <div className="font-extrabold text-slate-900">CHF {(computed.vat / 100).toFixed(2)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-600">TTC</div>
            <div className="font-extrabold text-slate-900">CHF {(grossCents / 100).toFixed(2)}</div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-2xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
        >
          {loading ? "Création..." : "Créer la facture"}
        </button>
      </div>
    </form>
  );
}
