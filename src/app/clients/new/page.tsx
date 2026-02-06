import type { Metadata } from "next";
import ClientFormClient from "./ClientFormClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Nouveau client – Comptabilité GAILLARD",
};

export default function NewClientPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-3xl font-extrabold tracking-tight text-slate-900">
            Nouveau client
          </div>
          <div className="mt-1 text-sm text-slate-600">
            Création d’un client (nom + contact + adresse)
          </div>
        </div>

        <a
          href="/clients"
          className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
        >
          Retour
        </a>
      </div>

      <div className="mt-6">
        <ClientFormClient />
      </div>
    </div>
  );
}
