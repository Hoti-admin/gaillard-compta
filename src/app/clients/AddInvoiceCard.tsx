"use client";

import { useState } from "react";
import { createInvoiceForClient } from "./actions";

type Props = {
  clientId: string;
  clientName: string;
};

export default function AddInvoiceCard({ clientId, clientName }: Props) {
  const [open, setOpen] = useState(false);

  // valeurs par défaut (pratique)
  const today = new Date();
  const issueDefault = today.toISOString().slice(0, 10);

  const due = new Date();
  due.setDate(due.getDate() + 30);
  const dueDefault = due.toISOString().slice(0, 10);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-extrabold text-slate-900">Factures</div>
          <div className="mt-1 text-sm text-slate-600">
            Client : <span className="font-semibold text-slate-900">{clientName}</span>
          </div>
        </div>

        <button
          onClick={() => setOpen(true)}
          className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          + Ajouter une facture
        </button>
      </div>

      {/* MODAL */}
      {open ? (
        <div className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center bg-black/50 px-4 py-6">
          <div className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-lg font-extrabold text-slate-900">Nouvelle facture</div>
                <div className="text-xs text-slate-600">Client : {clientName}</div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
              >
                Fermer
              </button>
            </div>

            <form
              action={async (fd) => {
                await createInvoiceForClient(fd);
                setOpen(false);
              }}
              className="mt-4 grid gap-3"
            >
              <input type="hidden" name="clientId" value={clientId} />

              <div>
                <label className="text-xs font-semibold text-slate-600">Chantier / Référence</label>
                <input
                  name="siteName"
                  placeholder="ex: PER24 - Rte des Cliniques 15"
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">N° facture *</label>
                <input
                  name="number"
                  required
                  placeholder="ex: 2026008"
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Date facture *</label>
                  <input
                    name="issueDate"
                    type="date"
                    required
                    defaultValue={issueDefault}
                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Échéance *</label>
                  <input
                    name="dueDate"
                    type="date"
                    required
                    defaultValue={dueDefault}
                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-slate-600">TTC (CHF) *</label>
                  <input
                    name="ttc"
                    required
                    inputMode="decimal"
                    placeholder="ex: 10695,50"
                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                  <div className="mt-1 text-[11px] text-slate-500">Virgule ou point accepté (iPhone OK).</div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600">TVA %</label>
                  <input
                    name="vat"
                    inputMode="decimal"
                    defaultValue="8.1"
                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                  <div className="mt-1 text-[11px] text-slate-500">Par défaut : 8.1%</div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">Notes (optionnel)</label>
                <textarea
                  name="notes"
                  rows={3}
                  placeholder="Infos complémentaires…"
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
                />
              </div>

              <button className="mt-2 rounded-2xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-800">
                Enregistrer la facture
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
