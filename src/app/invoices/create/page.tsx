import Link from "next/link";
import InvoiceCreateForm from "./InvoiceCreateForm";

export const dynamic = "force-dynamic";

export default function InvoiceCreatePage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-3xl font-extrabold tracking-tight text-slate-900">Nouvelle facture</div>
          <div className="mt-1 text-sm text-slate-600">
            Créer une facture (client, projet, dates, montants, TVA)
          </div>
        </div>

        <Link
          href="/invoices"
          className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
        >
          Retour
        </Link>
      </div>

      <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <InvoiceCreateForm />
      </div>
    </div>
  );
}
