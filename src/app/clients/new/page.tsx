import Link from "next/link";
import ClientCreateForm from "./ClientCreateForm";

export const dynamic = "force-dynamic";

export default function NewClientPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-3xl font-extrabold tracking-tight text-slate-900">Nouveau client</div>
          <div className="mt-1 text-sm text-slate-600">Création d’un client (nom + contact + adresse)</div>
        </div>

        <Link
          href="/clients"
          className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
        >
          Retour
        </Link>
      </div>

      <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <ClientCreateForm />
      </div>
    </div>
  );
}
